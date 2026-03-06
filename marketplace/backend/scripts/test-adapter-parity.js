/**
 * DB Adapter Parity Test Script
 *
 * Tests that the shared database adapter works correctly for the two most
 * critical paths: checkout (order creation) and auth (user/profile lookup).
 *
 * Usage:
 *   SQLite mode (local dev):
 *     node scripts/test-adapter-parity.js
 *
 *   Postgres/Supabase mode:
 *     DATABASE_URL=postgres://... node scripts/test-adapter-parity.js
 *     SUPABASE_DB_URL=postgres://... node scripts/test-adapter-parity.js
 *
 * Exit code 0 = all tests passed. Exit code 1 = one or more failures.
 */

require('dotenv').config();

const crypto = require('crypto');
const db = require('../database/database');

const USERS_TABLE = db.isPostgres ? 'profiles' : 'users';

let passed = 0;
let failed = 0;

function pass(name) {
    console.log(`[PASS] ${name}`);
    passed++;
}

function fail(name, err) {
    console.error(`[FAIL] ${name}: ${err && err.message ? err.message : err}`);
    failed++;
}

async function ensureTablesExist() {
    if (db.isSqlite) {
        // In SQLite mode, ensure the users and orders tables exist for testing.
        // database.js auto-creates some tables via initializeSqliteDatabase; we
        // create users/orders here idempotently for the test runner.
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
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
                customer_email TEXT NOT NULL,
                customer_name TEXT,
                book_id TEXT NOT NULL,
                book_title TEXT NOT NULL,
                book_author TEXT NOT NULL,
                format TEXT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                currency TEXT DEFAULT 'USD',
                status TEXT DEFAULT 'pending',
                payment_status TEXT DEFAULT 'pending',
                fulfillment_status TEXT DEFAULT 'pending',
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }
    // In Postgres mode, tables are created by supabase-migration.sql run via init.js.
}

// Test 1: Insert + read an order (checkout path)
async function testOrderInsertAndRead() {
    const testOrderId = `TEST-ORDER-${crypto.randomUUID().slice(0, 8)}`;
    try {
        await db.run(
            `INSERT INTO orders (order_id, customer_email, customer_name, book_id, book_title, book_author, format, price, status, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [testOrderId, 'parity-test@example.com', 'Parity Tester', 'test-book-001',
             'Test Book', 'Test Author', 'digital', 9.99, 'pending', 'pending']
        );

        const row = await db.get('SELECT * FROM orders WHERE order_id = ?', [testOrderId]);
        if (!row) throw new Error('Row not found after insert');
        if (row.customer_email !== 'parity-test@example.com') throw new Error('customer_email mismatch');
        if (parseFloat(row.price) !== 9.99) throw new Error(`price mismatch: got ${row.price}`);
        pass('Test 1: order insert + read');
    } catch (err) {
        fail('Test 1: order insert + read', err);
        testOrderId; // still need to clean up
    }
    // Cleanup
    try {
        await db.run('DELETE FROM orders WHERE order_id = ?', [testOrderId]);
    } catch (_) { /* cleanup — ignore errors */ }
}

// Test 2: Insert + read a user/profile (auth path)
async function testUserInsertAndRead() {
    const testUserId = crypto.randomUUID();
    const testEmail = `parity-test-${testUserId.slice(0, 8)}@example.com`;
    try {
        await db.run(
            `INSERT INTO ${USERS_TABLE} (id, email, name, auth_provider, email_verified, signup_source)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [testUserId, testEmail, 'Parity Test User', 'local', db.isPostgres ? false : 0, 'test']
        );

        const row = await db.get(`SELECT * FROM ${USERS_TABLE} WHERE id = ?`, [testUserId]);
        if (!row) throw new Error('Row not found after insert');
        if (row.email !== testEmail) throw new Error(`email mismatch: got ${row.email}`);
        if (row.name !== 'Parity Test User') throw new Error(`name mismatch: got ${row.name}`);
        pass('Test 2: user/profile insert + read');
    } catch (err) {
        fail('Test 2: user/profile insert + read', err);
    }
    // Cleanup
    try {
        await db.run(`DELETE FROM ${USERS_TABLE} WHERE id = ?`, [testUserId]);
    } catch (_) { /* cleanup — ignore errors */ }
}

// Test 3: Orders query that checkout uses (lookup by email)
async function testCheckoutOrderQuery() {
    const testOrderId = `TEST-ORDER-${crypto.randomUUID().slice(0, 8)}`;
    const testEmail = 'checkout-query-test@example.com';
    try {
        await db.run(
            `INSERT INTO orders (order_id, customer_email, customer_name, book_id, book_title, book_author, format, price, status, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [testOrderId, testEmail, 'Query Tester', 'test-book-002',
             'Query Book', 'Query Author', 'digital', 19.99, 'completed', 'paid']
        );

        const rows = await db.all(
            'SELECT order_id, customer_email, status, payment_status FROM orders WHERE customer_email = ? AND status = ?',
            [testEmail, 'completed']
        );
        if (!Array.isArray(rows)) throw new Error('Expected array result');
        if (rows.length < 1) throw new Error('No rows returned');
        if (rows[0].order_id !== testOrderId) throw new Error(`order_id mismatch: ${rows[0].order_id}`);
        pass('Test 3: checkout orders query (by email + status)');
    } catch (err) {
        fail('Test 3: checkout orders query (by email + status)', err);
    }
    // Cleanup
    try {
        await db.run('DELETE FROM orders WHERE order_id = ?', [testOrderId]);
    } catch (_) { /* cleanup — ignore errors */ }
}

// Test 4: User/profile query that auth uses (lookup by email)
async function testAuthUserQuery() {
    const testUserId = crypto.randomUUID();
    const testEmail = `auth-query-${testUserId.slice(0, 8)}@example.com`;
    try {
        await db.run(
            `INSERT INTO ${USERS_TABLE} (id, email, name, auth_provider, email_verified, account_status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [testUserId, testEmail, 'Auth Query User', 'local', db.isPostgres ? false : 0, 'active']
        );

        const row = await db.get(
            `SELECT id, email, name, account_status FROM ${USERS_TABLE} WHERE email = ? AND auth_provider = ?`,
            [testEmail, 'local']
        );
        if (!row) throw new Error('Row not found');
        if (row.id !== testUserId) throw new Error(`id mismatch: ${row.id}`);
        if (row.account_status !== 'active') throw new Error(`account_status mismatch: ${row.account_status}`);
        pass('Test 4: auth user/profile query (by email + provider)');
    } catch (err) {
        fail('Test 4: auth user/profile query (by email + provider)', err);
    }
    // Cleanup
    try {
        await db.run(`DELETE FROM ${USERS_TABLE} WHERE id = ?`, [testUserId]);
    } catch (_) { /* cleanup — ignore errors */ }
}

async function runTests() {
    const mode = db.isPostgres ? 'PostgreSQL/Supabase' : 'SQLite';
    console.log(`\n[DB Adapter Parity Test] Mode: ${mode}\n`);

    await ensureTablesExist();

    await testOrderInsertAndRead();
    await testUserInsertAndRead();
    await testCheckoutOrderQuery();
    await testAuthUserQuery();

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('[FATAL]', err);
    process.exit(1);
});
