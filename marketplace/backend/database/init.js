const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'orders.db');
const schemaPath = path.join(__dirname, 'schema.sql');

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

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');

db.serialize(() => {
    // Execute schema
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating schema:', err);
            process.exit(1);
        }
        console.log('Database schema created successfully');
    });

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