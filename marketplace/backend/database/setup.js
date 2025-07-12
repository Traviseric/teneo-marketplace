const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database configuration
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'marketplace.db');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database:', dbPath);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Database schema
const schema = `
-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    stripe_session_id VARCHAR(255),
    stripe_payment_intent VARCHAR(255),
    brand VARCHAR(50) DEFAULT 'default',
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'pending',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    book_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    digital_file_path VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Download tokens table
CREATE TABLE IF NOT EXISTS download_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(255) UNIQUE NOT NULL,
    order_id INTEGER NOT NULL,
    book_id VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    downloads INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 5,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_download_at DATETIME,
    ip_addresses TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    customer_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    message_id VARCHAR(255),
    error TEXT,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type VARCHAR(50) NOT NULL,
    book_id VARCHAR(100),
    order_id INTEGER,
    customer_id INTEGER,
    brand VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Stripe webhooks table (for idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT 0,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires ON download_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);
`;

// Initialize database
function initializeDatabase() {
    console.log('Initializing database schema...');
    
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating database schema:', err);
            process.exit(1);
        }
        
        console.log('Database schema created successfully');
        
        // Insert sample data for testing
        insertSampleData();
    });
}

// Insert sample data
function insertSampleData() {
    // Check if we already have data
    db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
        if (err) {
            console.error('Error checking data:', err);
            return;
        }
        
        if (row.count > 0) {
            console.log('Database already contains data');
            db.close();
            return;
        }
        
        console.log('Inserting sample data...');
        
        // Insert a test customer
        const insertCustomer = `
            INSERT INTO customers (email, name, stripe_customer_id)
            VALUES (?, ?, ?)
        `;
        
        db.run(insertCustomer, 
            ['demo@example.com', 'Demo User', 'cus_demo123'],
            function(err) {
                if (err) {
                    console.error('Error inserting customer:', err);
                    return;
                }
                
                console.log('Sample customer created with ID:', this.lastID);
                
                // Insert a test order
                const insertOrder = `
                    INSERT INTO orders (order_id, customer_id, total, status, payment_status)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                db.run(insertOrder,
                    ['DEMO-ORDER-001', this.lastID, 29.99, 'completed', 'paid'],
                    function(err) {
                        if (err) {
                            console.error('Error inserting order:', err);
                            return;
                        }
                        
                        console.log('Sample order created with ID:', this.lastID);
                        console.log('Database initialization complete!');
                        
                        db.close();
                    }
                );
            }
        );
    });
}

// Run initialization
initializeDatabase();

// Export database instance for use in other modules
module.exports = db;