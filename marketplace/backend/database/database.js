const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'marketplace.db');

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
    db.run(`ALTER TABLE orders ADD COLUMN abandonment_email_sent_at DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding abandonment_email_sent_at column:', err);
        }
    });

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
    `, (err) => {
        if (err) console.error('Error creating funnel tables:', err);
    });
}

// Export database connection
module.exports = db;