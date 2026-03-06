// NOTE: SQLite-only dev/admin script. Do NOT run against production (DATABASE_URL set).
if (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL) {
    console.error('ERROR: seed-dogfooding.js is a SQLite-only script. Use a Supabase migration instead.');
    process.exit(1);
}

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/marketplace.db');
const db = new sqlite3.Database(dbPath);

console.log('Seeding Dogfooding openbazaar.ai merch items to the database...');

const itemsToSeed = [
    {
        book_id: 'network-state-handbook',
        format_type: 'print_trade',
        pod_package_id: '0600X0900BWSTDPB060UW444MXX', // standard 6x9 paperback from Lulu
        page_count: 400,
        base_price: 6.50,
        our_price: 24.00,
        printable_id: '0', // If this is a real product we'd set the actual Lulu printable ID
        lulu_product_url: 'https://lulu.com',
        cover_url: 'https://openbazaar.ai/assets/network-state-cover.pdf',
        interior_url: 'https://openbazaar.ai/assets/network-state-interior.pdf'
    },
    {
        book_id: 'builders-heavy-tee',
        format_type: 'print_apparel', // Printful hypothetical format
        pod_package_id: 'printful_tee_001',
        page_count: 1,
        base_price: 15.00,
        our_price: 35.00,
        printable_id: '0',
        lulu_product_url: '',
        cover_url: '',
        interior_url: ''
    },
    {
        book_id: 'protocol-mug',
        format_type: 'print_merch', // Printful hypothetical format
        pod_package_id: 'printful_mug_001',
        page_count: 1,
        base_price: 7.00,
        our_price: 18.00,
        printable_id: '0',
        lulu_product_url: '',
        cover_url: '',
        interior_url: ''
    }
];

db.serialize(() => {
    // Attempt to create the book_formats table if it doesn't exist
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Insert seeds
    const stmt = db.prepare(`
        INSERT INTO book_formats (
            book_id, format_type, pod_package_id, page_count, base_price, our_price, printable_id, lulu_product_url, cover_url, interior_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of itemsToSeed) {
        stmt.run(
            item.book_id,
            item.format_type,
            item.pod_package_id,
            item.page_count,
            item.base_price,
            item.our_price,
            item.printable_id,
            item.lulu_product_url,
            item.cover_url,
            item.interior_url,
            (err) => {
                if (err) {
                    console.error('Error inserting', item.book_id, err.message);
                } else {
                    console.log('Inserted', item.book_id);
                }
            }
        );
    }
    stmt.finalize();
});

db.close(() => {
    console.log('Seeding complete.');
});
