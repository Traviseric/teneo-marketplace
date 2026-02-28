/**
 * Alias for database.js — fixes broken import path in TeneoAuthProvider.js.
 * Both db.js and database.js export the same shared SQLite connection.
 */
module.exports = require('./database');
