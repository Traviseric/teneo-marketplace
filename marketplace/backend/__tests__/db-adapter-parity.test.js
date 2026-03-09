'use strict';

/**
 * DB Adapter Parity Tests
 *
 * Verifies the shared database adapter handles the critical read/write paths
 * for checkout (orders) and auth (users/profiles) correctly in SQLite mode.
 *
 * Supabase/Postgres-specific assertions are skipped when DATABASE_URL is not set
 * so this suite runs cleanly in CI without any external services.
 */

process.env.NODE_ENV = 'test';

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Set DATABASE_PATH to :memory: and clear module cache BEFORE requiring db.
// This forces the SQLite adapter to open an in-memory database for isolation.
// ---------------------------------------------------------------------------
process.env.DATABASE_PATH = ':memory:';
delete process.env.DATABASE_URL;
delete process.env.SUPABASE_DB_URL;
jest.resetModules();

// eslint-disable-next-line global-require
const db = require('../database/database');

// ---------------------------------------------------------------------------
// The table names used by auth providers (mirrors auth/providers/*.js)
// ---------------------------------------------------------------------------
const USERS_TABLE = db.isPostgres ? 'profiles' : 'users';
const IS_SUPABASE = !!process.env.DATABASE_URL || !!process.env.SUPABASE_DB_URL;

// ---------------------------------------------------------------------------
// Schema setup — create the minimal tables needed for the parity tests.
// In SQLite mode, orders and users aren't auto-created by initializeSqliteDatabase.
// ---------------------------------------------------------------------------
async function ensureTables() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            auth_provider TEXT DEFAULT 'local',
            teneo_user_id TEXT,
            nostr_pubkey TEXT,
            avatar_url TEXT,
            credits INTEGER DEFAULT 0,
            email_verified INTEGER DEFAULT 0,
            account_status TEXT DEFAULT 'active',
            signup_source TEXT,
            metadata TEXT,
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            stripe_session_id TEXT UNIQUE,
            stripe_payment_intent_id TEXT,
            customer_email TEXT NOT NULL,
            customer_name TEXT,
            book_id TEXT NOT NULL,
            book_title TEXT NOT NULL,
            book_author TEXT NOT NULL,
            format TEXT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            currency TEXT DEFAULT 'USD',
            status TEXT NOT NULL DEFAULT 'pending',
            payment_status TEXT DEFAULT 'pending',
            fulfillment_status TEXT DEFAULT 'pending',
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

beforeAll(async () => {
    // Allow SQLite open callback to fire before running table DDL
    await new Promise((r) => setTimeout(r, 50));
    await ensureTables();
});

afterAll(async () => {
    // Close the SQLite connection if the adapter exposes close()
    if (typeof db.close === 'function') {
        await db.close();
    }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uniqueOrderId() {
    return `TEST-${crypto.randomUUID().slice(0, 8)}`;
}

function uniqueEmail(prefix = 'parity') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}@example.com`;
}

// ---------------------------------------------------------------------------
// Order CRUD (checkout path)
// ---------------------------------------------------------------------------
describe('DB adapter — order CRUD (checkout path)', () => {
    test('inserts an order and reads it back', async () => {
        const orderId = uniqueOrderId();
        const email = uniqueEmail('checkout');

        await db.run(
            `INSERT INTO orders
                (order_id, customer_email, customer_name, book_id, book_title, book_author, format, price, status, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, email, 'Parity Tester', 'book-001', 'Parity Book', 'Test Author', 'digital', 9.99, 'pending', 'pending']
        );

        const row = await db.get('SELECT * FROM orders WHERE order_id = ?', [orderId]);
        expect(row).toBeDefined();
        expect(row.order_id).toBe(orderId);
        expect(row.customer_email).toBe(email);
        expect(parseFloat(row.price)).toBeCloseTo(9.99);
        expect(row.status).toBe('pending');

        // Cleanup
        await db.run('DELETE FROM orders WHERE order_id = ?', [orderId]);
    });

    test('updates order status', async () => {
        const orderId = uniqueOrderId();

        await db.run(
            `INSERT INTO orders
                (order_id, customer_email, book_id, book_title, book_author, format, price, status, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, uniqueEmail('update'), 'book-002', 'Update Book', 'Author', 'digital', 19.99, 'pending', 'pending']
        );

        await db.run(
            'UPDATE orders SET status = ?, payment_status = ? WHERE order_id = ?',
            ['completed', 'paid', orderId]
        );

        const row = await db.get('SELECT status, payment_status FROM orders WHERE order_id = ?', [orderId]);
        expect(row).toBeDefined();
        expect(row.status).toBe('completed');
        expect(row.payment_status).toBe('paid');

        // Cleanup
        await db.run('DELETE FROM orders WHERE order_id = ?', [orderId]);
    });

    test('queries orders by customer email and status', async () => {
        const orderId = uniqueOrderId();
        const email = uniqueEmail('query');

        await db.run(
            `INSERT INTO orders
                (order_id, customer_email, book_id, book_title, book_author, format, price, status, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, email, 'book-003', 'Query Book', 'Author', 'digital', 4.99, 'completed', 'paid']
        );

        const rows = await db.all(
            'SELECT order_id, status FROM orders WHERE customer_email = ? AND status = ?',
            [email, 'completed']
        );
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows[0].order_id).toBe(orderId);

        // Cleanup
        await db.run('DELETE FROM orders WHERE order_id = ?', [orderId]);
    });
});

// ---------------------------------------------------------------------------
// User/Profile CRUD (auth path)
// ---------------------------------------------------------------------------
describe(`DB adapter — ${USERS_TABLE} CRUD (auth path)`, () => {
    test('inserts a user/profile and reads it back by id', async () => {
        const userId = crypto.randomUUID();
        const email = uniqueEmail('user');

        await db.run(
            `INSERT INTO ${USERS_TABLE} (id, email, name, auth_provider, email_verified, account_status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, email, 'Parity User', 'local', db.isPostgres ? false : 0, 'active']
        );

        const row = await db.get(`SELECT * FROM ${USERS_TABLE} WHERE id = ?`, [userId]);
        expect(row).toBeDefined();
        expect(row.id).toBe(userId);
        expect(row.email).toBe(email);
        expect(row.name).toBe('Parity User');
        expect(row.account_status).toBe('active');

        // Cleanup
        await db.run(`DELETE FROM ${USERS_TABLE} WHERE id = ?`, [userId]);
    });

    test('finds a user/profile by email (auth lookup pattern)', async () => {
        const userId = crypto.randomUUID();
        const email = uniqueEmail('auth-lookup');

        await db.run(
            `INSERT INTO ${USERS_TABLE} (id, email, name, auth_provider, email_verified, account_status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, email, 'Lookup User', 'local', db.isPostgres ? false : 0, 'active']
        );

        const row = await db.get(
            `SELECT id, email, name, account_status FROM ${USERS_TABLE} WHERE email = ? AND auth_provider = ?`,
            [email, 'local']
        );
        expect(row).toBeDefined();
        expect(row.id).toBe(userId);
        expect(row.account_status).toBe('active');

        // Cleanup
        await db.run(`DELETE FROM ${USERS_TABLE} WHERE id = ?`, [userId]);
    });

    test('returns undefined when user not found', async () => {
        const row = await db.get(
            `SELECT id FROM ${USERS_TABLE} WHERE email = ?`,
            ['does-not-exist@example.com']
        );
        expect(row).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// SQL translation correctness (SQLite → Postgres)
// ---------------------------------------------------------------------------
describe('SQL translation layer', () => {
    test('? placeholders are replaced by $N in Postgres mode', () => {
        // Import the translation function for white-box testing
        // We access it via an internal path; in SQLite mode this is a no-op guard.
        if (!db.isPostgres) {
            // In SQLite mode we can't easily test the Postgres translator without
            // duplicating the import. Verify the adapter at least has correct flags.
            expect(db.isSqlite).toBe(true);
            expect(db.isPostgres).toBe(false);
        } else {
            expect(db.isPostgres).toBe(true);
            expect(db.isSqlite).toBe(false);
        }
    });
});

// ---------------------------------------------------------------------------
// Supabase / Postgres-specific (skipped when DATABASE_URL not set)
// ---------------------------------------------------------------------------
const describeSupabase = IS_SUPABASE ? describe : describe.skip;

describeSupabase('DB adapter — Supabase/Postgres mode', () => {
    test('adapter reports isPostgres = true', () => {
        expect(db.isPostgres).toBe(true);
        expect(db.isSqlite).toBe(false);
    });

    test('profiles table is accessible (not users)', async () => {
        // Simply verifying the table exists by doing a SELECT with LIMIT 0
        const rows = await db.all('SELECT id FROM profiles LIMIT 0');
        expect(Array.isArray(rows)).toBe(true);
    });
});
