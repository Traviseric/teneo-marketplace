/**
 * Alias for database.js — fixes broken import path in TeneoAuthProvider.js.
 * Both db.js and database.js export the same shared DB adapter
 * (SQLite default, PostgreSQL/Supabase when DATABASE_URL is set).
 */
module.exports = require('./database');
