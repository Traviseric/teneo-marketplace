const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'orders.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Run existing schema files
    const schemaFiles = [
        'schema.sql',
        'schema-production.sql',
        'schema-lulu.sql'
    ];
    
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
}

// Export database connection
module.exports = db;