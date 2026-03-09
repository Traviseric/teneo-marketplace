const fs = require('fs');
const path = require('path');

const isPostgres = Boolean(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
// In production containers (Render, Vercel) the app directory is read-only.
// Fall back to /tmp which is always writable, unless DATABASE_PATH is explicitly set.
const defaultDbPath = process.env.NODE_ENV === 'production'
    ? '/tmp/marketplace.db'
    : path.join(__dirname, 'marketplace.db');
const dbPath = process.env.DATABASE_PATH || defaultDbPath;

function readSchemaIfExists(filePath) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

async function initSqlite() {
    // eslint-disable-next-line global-require
    const sqlite3 = require('sqlite3').verbose();

    const schemaPath = path.join(__dirname, 'schema.sql');
    const luluSchemaPath = path.join(__dirname, 'schema-lulu.sql');
    const aiDiscoverySchemaPath = path.join(__dirname, 'schema-ai-discovery.sql');
    const censorshipTrackerSchemaPath = path.join(__dirname, 'schema-censorship-tracker.sql');
    const nftSchemaPath = path.join(__dirname, 'schema-nft.sql');
    const coursesSchemaPath = path.join(__dirname, 'schema-courses.sql');
    const funnelsSchemaPath = path.join(__dirname, 'schema-funnels.sql');
    const emailMarketingSchemaPath = path.join(__dirname, 'schema-email-marketing.sql');
    const appStoreSchemaPath = path.join(__dirname, 'schema-appstore.sql');
    const storesSchemaPath = path.join(__dirname, 'schema-stores.sql');

    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = await new Promise((resolve, reject) => {
        const connection = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('Connected to SQLite database');
                resolve(connection);
            }
        });
    });

    const execAsync = (sql) => new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    const allAsync = (sql) => new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });

    const closeAsync = () => new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    const authSchemaPath = path.join(__dirname, 'schema-auth.sql');

    const schemaParts = [
        { name: 'Main', sql: fs.readFileSync(schemaPath, 'utf8') },
        { name: 'Auth', sql: readSchemaIfExists(authSchemaPath) },
        { name: 'Lulu', sql: readSchemaIfExists(luluSchemaPath) },
        { name: 'AI Discovery', sql: readSchemaIfExists(aiDiscoverySchemaPath) },
        { name: 'Censorship Tracker', sql: readSchemaIfExists(censorshipTrackerSchemaPath) },
        { name: 'NFT', sql: readSchemaIfExists(nftSchemaPath) },
        { name: 'Courses', sql: readSchemaIfExists(coursesSchemaPath) },
        { name: 'Funnels', sql: readSchemaIfExists(funnelsSchemaPath) },
        { name: 'Email Marketing', sql: readSchemaIfExists(emailMarketingSchemaPath) },
        { name: 'App Store', sql: readSchemaIfExists(appStoreSchemaPath) },
        { name: 'Stores', sql: readSchemaIfExists(storesSchemaPath) },
    ];

    for (const part of schemaParts) {
        if (!part.sql) continue;
        await execAsync(part.sql);
        console.log(`✅ ${part.name} schema created successfully`);
    }

    const tables = await allAsync("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables created:', tables.map((t) => t.name).join(', '));

    await closeAsync();
    console.log('Database initialization complete');

    return { mode: 'sqlite', dbPath };
}

async function initPostgres() {
    // eslint-disable-next-line global-require
    const { Client } = require('pg');

    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    const migrationPath = path.join(__dirname, 'supabase-migration.sql');

    if (!fs.existsSync(migrationPath)) {
        throw new Error(`Postgres mode requires ${migrationPath}`);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    const sslRequested = process.env.PGSSLMODE === 'require' || process.env.PGSSL === 'true' || /supabase\.co/i.test(databaseUrl || '');

    const client = new Client({
        connectionString: databaseUrl,
        ssl: sslRequested ? { rejectUnauthorized: false } : undefined,
    });

    await client.connect();
    console.log('Connected to PostgreSQL database');

    try {
        await client.query(migrationSql);
        console.log('✅ Supabase/PostgreSQL migration applied successfully');

        const tableResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('Tables found:', tableResult.rows.map((r) => r.table_name).join(', '));
        console.log('Database initialization complete');

        return { mode: 'postgres', databaseUrl };
    } finally {
        await client.end();
    }
}

async function initDatabase() {
    if (isPostgres) {
        return initPostgres();
    }
    return initSqlite();
}

const initPromise = initDatabase().catch((error) => {
    console.error('Database initialization failed:', error);
    if (require.main === module) {
        process.exit(1);
    }
    throw error;
});

if (require.main === module) {
    initPromise.then(() => {
        process.exit(0);
    });
}

module.exports = initPromise;
