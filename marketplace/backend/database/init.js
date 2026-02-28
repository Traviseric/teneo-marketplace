const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'orders.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const luluSchemaPath = path.join(__dirname, 'schema-lulu.sql');
const aiDiscoverySchemaPath = path.join(__dirname, 'schema-ai-discovery.sql');
const censorshipTrackerSchemaPath = path.join(__dirname, 'schema-censorship-tracker.sql');
const nftSchemaPath = path.join(__dirname, 'schema-nft.sql');
const coursesSchemaPath = path.join(__dirname, 'schema-courses.sql');
const funnelsSchemaPath = path.join(__dirname, 'schema-funnels.sql');

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Read and execute schemas
const schema = fs.readFileSync(schemaPath, 'utf8');
const luluSchema = fs.existsSync(luluSchemaPath) ? fs.readFileSync(luluSchemaPath, 'utf8') : '';
const aiDiscoverySchema = fs.existsSync(aiDiscoverySchemaPath) ? fs.readFileSync(aiDiscoverySchemaPath, 'utf8') : '';
const censorshipTrackerSchema = fs.existsSync(censorshipTrackerSchemaPath) ? fs.readFileSync(censorshipTrackerSchemaPath, 'utf8') : '';
const nftSchema = fs.existsSync(nftSchemaPath) ? fs.readFileSync(nftSchemaPath, 'utf8') : '';
const coursesSchema = fs.existsSync(coursesSchemaPath) ? fs.readFileSync(coursesSchemaPath, 'utf8') : '';
const funnelsSchema = fs.existsSync(funnelsSchemaPath) ? fs.readFileSync(funnelsSchemaPath, 'utf8') : '';

db.serialize(() => {
    // Execute main schema
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating main schema:', err);
            process.exit(1);
        }
        console.log('✅ Main database schema created successfully');
    });

    // Execute Lulu schema if exists
    if (luluSchema) {
        db.exec(luluSchema, (err) => {
            if (err) {
                console.error('Error creating Lulu schema:', err);
            } else {
                console.log('✅ Lulu schema created successfully');
            }
        });
    }

    // Execute AI Discovery schema if exists
    if (aiDiscoverySchema) {
        db.exec(aiDiscoverySchema, (err) => {
            if (err) {
                console.error('Error creating AI Discovery schema:', err);
            } else {
                console.log('✅ AI Discovery schema created successfully');
            }
        });
    }

    // Execute Censorship Tracker schema if exists
    if (censorshipTrackerSchema) {
        db.exec(censorshipTrackerSchema, (err) => {
            if (err) {
                console.error('Error creating Censorship Tracker schema:', err);
            } else {
                console.log('✅ Censorship Tracker schema created successfully');
            }
        });
    }

    // Execute NFT schema if exists
    if (nftSchema) {
        db.exec(nftSchema, (err) => {
            if (err) {
                console.error('Error creating NFT schema:', err);
            } else {
                console.log('✅ NFT schema created successfully');
            }
        });
    }

    // Execute Courses schema if exists
    if (coursesSchema) {
        db.exec(coursesSchema, (err) => {
            if (err) {
                console.error('Error creating Courses schema:', err);
            } else {
                console.log('✅ Courses schema created successfully');
            }
        });
    }

    // Execute Funnels schema if exists
    if (funnelsSchema) {
        db.exec(funnelsSchema, (err) => {
            if (err) {
                console.error('Error creating Funnels schema:', err);
            } else {
                console.log('✅ Funnels schema created successfully');
            }
        });
    }

    // Verify tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('Error verifying tables:', err);
        } else {
            console.log('Tables created:', tables.map(t => t.name).join(', '));
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database initialization complete');
    }
});

module.exports = { dbPath };