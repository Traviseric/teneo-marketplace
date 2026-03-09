const fs = require('fs');
const path = require('path');

const SQLITE_MODE = !process.env.DATABASE_URL && !process.env.SUPABASE_DB_URL;

if (process.env.NODE_ENV !== 'test') {
    console.log(`[DB] Mode: ${SQLITE_MODE ? 'SQLite (local)' : 'Postgres/Supabase'}`);
}

function normalizeArgs(params, callback) {
    if (typeof params === 'function') {
        return { params: [], callback: params };
    }
    return { params: Array.isArray(params) ? params : [], callback };
}

function ensureDirExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function replaceQuestionPlaceholders(sql) {
    let output = '';
    let inSingle = false;
    let inDouble = false;
    let index = 0;

    for (let i = 0; i < sql.length; i += 1) {
        const ch = sql[i];

        if (ch === "'" && !inDouble) {
            if (inSingle && sql[i + 1] === "'") {
                output += "''";
                i += 1;
                continue;
            }
            inSingle = !inSingle;
            output += ch;
            continue;
        }

        if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
            output += ch;
            continue;
        }

        if (ch === '?' && !inSingle && !inDouble) {
            index += 1;
            output += `$${index}`;
            continue;
        }

        output += ch;
    }

    return output;
}

function appendBeforeSemicolon(sql, suffix) {
    if (/;\s*$/.test(sql)) {
        return sql.replace(/;\s*$/, ` ${suffix};`);
    }
    return `${sql} ${suffix}`;
}

function rewriteInsertOrReplace(sql) {
    const match = sql.match(/^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+([^\s(]+)\s*\(([^)]+)\)\s*([\s\S]*)$/i);
    if (!match) {
        return sql.replace(/\bINSERT\s+OR\s+REPLACE\s+INTO\b/i, 'INSERT INTO');
    }

    const [, table, columnList, remainder] = match;
    const columns = columnList.split(',').map((c) => c.trim()).filter(Boolean);
    if (columns.length === 0) {
        return sql.replace(/\bINSERT\s+OR\s+REPLACE\s+INTO\b/i, 'INSERT INTO');
    }

    const conflictTarget = columns[0];
    const updates = columns
        .slice(1)
        .map((col) => `${col} = EXCLUDED.${col}`)
        .join(', ');

    let rewritten = `INSERT INTO ${table} (${columns.join(', ')}) ${remainder.trim()}`;
    const conflictClause = updates
        ? `ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates}`
        : `ON CONFLICT (${conflictTarget}) DO NOTHING`;

    rewritten = appendBeforeSemicolon(rewritten, conflictClause);
    return rewritten;
}

function translateSqliteToPostgres(sql) {
    let translated = replaceQuestionPlaceholders(sql);

    translated = translated.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT INTO');

    if (/\bINSERT\s+INTO\b/i.test(translated) && /\bINSERT\s+OR\s+IGNORE\b/i.test(sql) && !/\bON\s+CONFLICT\b/i.test(translated)) {
        translated = appendBeforeSemicolon(translated, 'ON CONFLICT DO NOTHING');
    }

    if (/\bINSERT\s+OR\s+REPLACE\s+INTO\b/i.test(sql)) {
        translated = rewriteInsertOrReplace(translated);
    }

    translated = translated
        .replace(/GROUP_CONCAT\(\s*([^,()]+?)\s*,\s*'([^']*)'\s*\)/gi, "STRING_AGG(($1)::text, '$2')")
        .replace(/GROUP_CONCAT\(\s*([^)]+?)\s*\)/gi, "STRING_AGG(($1)::text, ',')")
        .replace(/json_extract\(\s*([^,]+?)\s*,\s*'\$\.([A-Za-z0-9_]+)'\s*\)/gi, "($1::jsonb ->> '$2')")
        .replace(
            /json_set\(\s*COALESCE\(\s*([^,]+?)\s*,\s*'\{\}'\s*\)\s*,\s*'\$\.([A-Za-z0-9_]+)'\s*,\s*(\$\d+)\s*\)/gi,
            "jsonb_set(COALESCE($1::jsonb, '{}'::jsonb), '{$2}', to_jsonb($3::text), true)::text"
        )
        .replace(
            /json_set\(\s*([^,]+?)\s*,\s*'\$\.([A-Za-z0-9_]+)'\s*,\s*(\$\d+)\s*\)/gi,
            "jsonb_set(COALESCE($1::jsonb, '{}'::jsonb), '{$2}', to_jsonb($3::text), true)::text"
        )
        .replace(
            /json_patch\(\s*([^,]+?)\s*,\s*'\$\.([A-Za-z0-9_]+)'\s*,\s*(\$\d+)\s*\)/gi,
            "jsonb_set(COALESCE($1::jsonb, '{}'::jsonb), '{$2}', to_jsonb($3::text), true)::text"
        )
        .replace(/strftime\('%Y-%m'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM')")
        .replace(/datetime\('now'\s*,\s*'-\s*([0-9]+)\s+days?'\)/gi, "(NOW() - INTERVAL '$1 days')")
        .replace(/datetime\('now'\s*,\s*'-\s*([0-9]+)\s+hours?'\)/gi, "(NOW() - INTERVAL '$1 hours')")
        .replace(/date\('now'\s*,\s*'-\s*([0-9]+)\s+days?'\)/gi, "(CURRENT_DATE - INTERVAL '$1 days')")
        .replace(
            /datetime\('now'\s*,\s*'-'\s*\|\|\s*(\$\d+)\s*\|\|\s*'\s*days?'\s*\)/gi,
            "(NOW() - (($1 || ' days')::interval))"
        )
        .replace(
            /date\('now'\s*,\s*'-'\s*\|\|\s*(\$\d+)\s*\|\|\s*'\s*days?'\s*\)/gi,
            "(CURRENT_DATE - (($1 || ' days')::interval))"
        )
        .replace(
            /datetime\(\s*([^,()]+?)\s*,\s*'\+'\s*\|\|\s*([^|)]+?)\s*\|\|\s*'\s*hours?'\s*\)/gi,
            "($1 + (($2 || ' hours')::interval))"
        )
        .replace(
            /datetime\(\s*([^,()]+?)\s*,\s*'\+'\s*\|\|\s*([^|)]+?)\s*\|\|\s*'\s*days?'\s*\)/gi,
            "($1 + (($2 || ' days')::interval))"
        )
        .replace(/datetime\('now'\)/gi, 'NOW()')
        .replace(/date\('now'\)/gi, 'CURRENT_DATE');

    return translated;
}

function createPgQueryRunner(queryFn) {
    const run = async (sql, params = []) => {
        const translated = translateSqliteToPostgres(sql);
        const isInsert = /^\s*insert\s+/i.test(translated);

        if (isInsert && !/\bRETURNING\b/i.test(translated)) {
            try {
                const withReturning = appendBeforeSemicolon(translated, 'RETURNING id');
                const result = await queryFn(withReturning, params);
                const first = result.rows && result.rows[0] ? result.rows[0] : null;
                return {
                    lastID: first ? (first.id ?? first.ID ?? null) : null,
                    changes: result.rowCount || 0,
                };
            } catch (error) {
                if (!/column\s+"id"\s+does\s+not\s+exist/i.test(error.message || '')) {
                    throw error;
                }
            }
        }

        const result = await queryFn(translated, params);
        return {
            lastID: null,
            changes: result.rowCount || 0,
        };
    };

    const get = async (sql, params = []) => {
        const translated = translateSqliteToPostgres(sql);
        const result = await queryFn(translated, params);
        return (result.rows && result.rows[0]) || undefined;
    };

    const all = async (sql, params = []) => {
        const translated = translateSqliteToPostgres(sql);
        const result = await queryFn(translated, params);
        return result.rows || [];
    };

    const exec = async (sql) => {
        const translated = translateSqliteToPostgres(sql);
        const result = await queryFn(translated);
        return {
            changes: result.rowCount || 0,
        };
    };

    return { run, get, all, exec };
}

function createPostgresAdapter() {
    // Lazy require so SQLite-only deployments don't need pg installed.
    // eslint-disable-next-line global-require
    const { Pool } = require('pg');

    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    const sslRequested = process.env.PGSSLMODE === 'require' || process.env.PGSSL === 'true' || /supabase\.co/i.test(databaseUrl || '');

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: sslRequested ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
        console.error('[DB] Unexpected PostgreSQL pool error:', err.message);
    });

    const queryRunner = createPgQueryRunner((text, values = []) => pool.query(text, values));

    const db = {
        isPostgres: true,
        isSqlite: false,

        run(sql, params, callback) {
            const normalized = normalizeArgs(params, callback);
            if (normalized.callback) {
                queryRunner
                    .run(sql, normalized.params)
                    .then((meta) => normalized.callback.call({ lastID: meta.lastID, changes: meta.changes }, null))
                    .catch((err) => normalized.callback(err));
                return this;
            }
            return queryRunner.run(sql, normalized.params);
        },

        get(sql, params, callback) {
            const normalized = normalizeArgs(params, callback);
            if (normalized.callback) {
                queryRunner
                    .get(sql, normalized.params)
                    .then((row) => normalized.callback(null, row))
                    .catch((err) => normalized.callback(err));
                return this;
            }
            return queryRunner.get(sql, normalized.params);
        },

        all(sql, params, callback) {
            const normalized = normalizeArgs(params, callback);
            if (normalized.callback) {
                queryRunner
                    .all(sql, normalized.params)
                    .then((rows) => normalized.callback(null, rows))
                    .catch((err) => normalized.callback(err));
                return this;
            }
            return queryRunner.all(sql, normalized.params);
        },

        exec(sql, callback) {
            if (typeof callback === 'function') {
                queryRunner
                    .exec(sql)
                    .then(() => callback(null))
                    .catch((err) => callback(err));
                return this;
            }
            return queryRunner.exec(sql);
        },

        serialize(fn) {
            if (typeof fn === 'function') {
                fn();
            }
            return this;
        },

        async transaction(work) {
            const client = await pool.connect();
            const txRunner = createPgQueryRunner((text, values = []) => client.query(text, values));

            const txDb = {
                run: (sql, params = []) => txRunner.run(sql, params),
                get: (sql, params = []) => txRunner.get(sql, params),
                all: (sql, params = []) => txRunner.all(sql, params),
                exec: (sql) => txRunner.exec(sql),
            };

            try {
                await client.query('BEGIN');
                const result = await work(txDb);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error('[DB] Transaction rollback failed:', rollbackError.message);
                }
                throw error;
            } finally {
                client.release();
            }
        },

        close(callback) {
            const closePromise = pool.end();
            if (typeof callback === 'function') {
                closePromise.then(() => callback(null)).catch((err) => callback(err));
                return this;
            }
            return closePromise;
        },
    };

    if (process.env.NODE_ENV !== 'test') {
        console.log('[DB] Connected to PostgreSQL (Supabase mode)');
    }
    return db;
}

function createSqliteAdapter() {
    // eslint-disable-next-line global-require
    const sqlite3 = require('sqlite3').verbose();

    // In production containers (Render, Vercel) the app directory is read-only.
    // Fall back to /tmp which is always writable, unless DATABASE_PATH is explicitly set.
    const defaultDbPath = process.env.NODE_ENV === 'production'
        ? '/tmp/marketplace.db'
        : path.join(__dirname, 'marketplace.db');
    const dbPath = process.env.DATABASE_PATH || defaultDbPath;
    ensureDirExists(dbPath);

    const rawDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            if (process.env.NODE_ENV !== 'test') {
                console.log('Connected to SQLite database');
            }
            initializeSqliteDatabase(rawDb);
        }
    });

    const originalRun = rawDb.run.bind(rawDb);
    const originalGet = rawDb.get.bind(rawDb);
    const originalAll = rawDb.all.bind(rawDb);
    const originalExec = rawDb.exec.bind(rawDb);

    rawDb.run = function run(sql, params, callback) {
        const normalized = normalizeArgs(params, callback);
        if (normalized.callback) {
            return originalRun(sql, normalized.params, normalized.callback);
        }

        return new Promise((resolve, reject) => {
            originalRun(sql, normalized.params, function onRun(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    };

    rawDb.get = function get(sql, params, callback) {
        const normalized = normalizeArgs(params, callback);
        if (normalized.callback) {
            return originalGet(sql, normalized.params, normalized.callback);
        }

        return new Promise((resolve, reject) => {
            originalGet(sql, normalized.params, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    };

    rawDb.all = function all(sql, params, callback) {
        const normalized = normalizeArgs(params, callback);
        if (normalized.callback) {
            return originalAll(sql, normalized.params, normalized.callback);
        }

        return new Promise((resolve, reject) => {
            originalAll(sql, normalized.params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows || []);
            });
        });
    };

    rawDb.exec = function exec(sql, callback) {
        if (typeof callback === 'function') {
            return originalExec(sql, callback);
        }

        return new Promise((resolve, reject) => {
            originalExec(sql, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ changes: 0 });
            });
        });
    };

    rawDb.isPostgres = false;
    rawDb.isSqlite = true;

    rawDb.transaction = async function transaction(work) {
        await rawDb.run('BEGIN TRANSACTION');
        try {
            const result = await work(rawDb);
            await rawDb.run('COMMIT');
            return result;
        } catch (error) {
            try {
                await rawDb.run('ROLLBACK');
            } catch (rollbackError) {
                console.error('[DB] SQLite rollback failed:', rollbackError.message);
            }
            throw error;
        }
    };

    return rawDb;
}

function initializeSqliteDatabase(db) {
    // Ensure books table exists
    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            description TEXT,
            category TEXT,
            badge TEXT,
            coverImage TEXT,
            pdfPath TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating books table:', err);
        }
    });

    // Ensure book_formats table exists (from schema-lulu.sql)
    db.run(`
        CREATE TABLE IF NOT EXISTS book_formats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id TEXT NOT NULL,
            format_type TEXT NOT NULL,
            pod_package_id TEXT,
            page_count INTEGER,
            base_price DECIMAL(10,2),
            our_price DECIMAL(10,2),
            printable_id TEXT,
            lulu_product_url TEXT,
            cover_url TEXT,
            interior_url TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(book_id, format_type)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating book_formats table:', err);
        }
    });

    // Course platform tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_id TEXT NOT NULL,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT,
            price_cents INTEGER DEFAULT 0,
            is_published INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS course_modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            order_index INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS course_lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            content_type TEXT DEFAULT 'video',
            content_url TEXT,
            content_body TEXT,
            order_index INTEGER DEFAULT 0,
            is_free_preview INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS course_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER REFERENCES courses(id),
            user_email TEXT NOT NULL,
            order_id TEXT,
            enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            UNIQUE(course_id, user_email)
        );
        CREATE TABLE IF NOT EXISTS course_progress (
            enrollment_id INTEGER REFERENCES course_enrollments(id) ON DELETE CASCADE,
            lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE CASCADE,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (enrollment_id, lesson_id)
        );
    `, (err) => {
        if (err) console.error('Error creating course tables:', err);
    });

    // Migration: add abandonment_email_sent_at to orders (idempotent)
    db.run('ALTER TABLE orders ADD COLUMN abandonment_email_sent_at DATETIME', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding abandonment_email_sent_at column:', err);
        }
    });

    // Printful migration: add POD tracking columns (idempotent)
    const ensurePrintfulOrderIndex = () => {
        db.run('CREATE INDEX IF NOT EXISTS idx_orders_printful_order_id ON orders(printful_order_id)', (err) => {
            if (err) {
                console.error('Error creating idx_orders_printful_order_id:', err);
            }
        });
    };

    const ensureLuluOrderIndex = () => {
        db.run('CREATE INDEX IF NOT EXISTS idx_orders_lulu_print_job_id ON orders(lulu_print_job_id)', (err) => {
            if (err) {
                console.error('Error creating idx_orders_lulu_print_job_id:', err);
            }
        });
    };

    db.run('ALTER TABLE orders ADD COLUMN lulu_print_job_id TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding lulu_print_job_id column:', err);
        }
        ensureLuluOrderIndex();
    });
    db.run('ALTER TABLE orders ADD COLUMN printful_order_id TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding printful_order_id column:', err);
        }
        ensurePrintfulOrderIndex();
    });
    db.run('ALTER TABLE orders ADD COLUMN tracking_number TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding tracking_number column:', err);
        }
    });
    db.run('ALTER TABLE orders ADD COLUMN tracking_url TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding tracking_url column:', err);
        }
    });
    db.run(`
        CREATE TABLE IF NOT EXISTS printful_webhook_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT UNIQUE,
            event_type TEXT NOT NULL,
            printful_order_id TEXT,
            external_order_id TEXT,
            payload TEXT NOT NULL,
            processed BOOLEAN DEFAULT 0,
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME
        )
    `, (err) => {
        if (err) {
            console.error('Error creating printful_webhook_events table:', err);
        }
    });

    // Coupons (server-side, with expiry + usage limits)
    db.exec(`
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            expires_at TEXT,
            max_uses INTEGER,
            used_count INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
        CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
        CREATE TABLE IF NOT EXISTS order_bumps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger_product_id TEXT,
            bump_product_name TEXT NOT NULL,
            bump_description TEXT,
            bump_price REAL NOT NULL,
            bump_stripe_price_id TEXT,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_order_bumps_active ON order_bumps(active);
    `, (err) => {
        if (err) console.error('Error creating coupons/order_bumps tables:', err);
    });

    // Agent App Store schema (schema-appstore.sql)
    const appStoreSqlPath = path.join(__dirname, 'schema-appstore.sql');
    if (fs.existsSync(appStoreSqlPath)) {
        const appStoreSql = fs.readFileSync(appStoreSqlPath, 'utf8');
        db.exec(appStoreSql, (err) => {
            if (err) console.error('Error creating app store tables:', err);
        });
    }

    // Funnel persistence tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS funnels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            user_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS funnel_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL,
            funnel_name TEXT NOT NULL,
            template TEXT,
            variables TEXT,
            context TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, funnel_name)
        );
        CREATE TABLE IF NOT EXISTS funnel_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funnel_id TEXT NOT NULL,
            page_slug TEXT,
            event_type TEXT NOT NULL,
            session_id TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel ON funnel_events(funnel_id);
        CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(funnel_id, event_type);
    `, (err) => {
        if (err) console.error('Error creating funnel tables:', err);
    });

    // Funnel schema migrations (idempotent)
    db.run('ALTER TABLE funnels ADD COLUMN config_json TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding funnels.config_json:', err);
        }
    });
    db.run('ALTER TABLE funnels ADD COLUMN conversion_rate REAL DEFAULT 0', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding funnels.conversion_rate:', err);
        }
    });

    // Email marketing tables (schema-email-marketing.sql)
    const emailMktSqlPath = path.join(__dirname, 'schema-email-marketing.sql');
    if (fs.existsSync(emailMktSqlPath)) {
        const emailMktSql = fs.readFileSync(emailMktSqlPath, 'utf8');
        db.exec(emailMktSql, (err) => {
            if (err) console.error('Error creating email marketing tables:', err.message);
        });
    }

    // Course quiz/certificate tables (schema-courses.sql)
    const coursesSqlPath = path.join(__dirname, 'schema-courses.sql');
    if (fs.existsSync(coursesSqlPath)) {
        const coursesSql = fs.readFileSync(coursesSqlPath, 'utf8');
        db.exec(coursesSql, (err) => {
            if (err) console.error('Error creating extended course tables:', err.message);
        });
    }

    // License keys table (content protection for software products)
    db.exec(`
        CREATE TABLE IF NOT EXISTS license_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            max_activations INTEGER DEFAULT 3,
            activations INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            revoked_at DATETIME
        );
        CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key);
        CREATE INDEX IF NOT EXISTS idx_license_keys_order ON license_keys(order_id);
        CREATE INDEX IF NOT EXISTS idx_license_keys_email ON license_keys(customer_email);
    `, (err) => {
        if (err) console.error('Error creating license_keys table:', err.message);
    });
}

const db = SQLITE_MODE ? createSqliteAdapter() : createPostgresAdapter();

/**
 * Creates a bare sqlite3.Database instance at the given path.
 * Used by services that need an isolated in-memory DB (e.g. tests).
 * Centralises the sqlite3 require so services/ never import it directly.
 */
function createRawSqliteDb(dbPath) {
    // eslint-disable-next-line global-require
    const sqlite3 = require('sqlite3').verbose();
    return new sqlite3.Database(dbPath);
}

module.exports = db;
module.exports.createRawSqliteDb = createRawSqliteDb;
