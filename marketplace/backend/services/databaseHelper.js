/**
 * Shared promisified database helpers.
 *
 * Centralises dbRun / dbGet / dbAll so route files don't each copy-paste
 * the same wrapper. database.js already returns Promises when called without
 * a callback, so these thin helpers simply forward the call.
 */

const db = require('../database/database');

function dbRun(sql, params = []) {
    return db.run(sql, params);
}

function dbGet(sql, params = []) {
    return db.get(sql, params);
}

function dbAll(sql, params = []) {
    return db.all(sql, params);
}

module.exports = { dbRun, dbGet, dbAll };
