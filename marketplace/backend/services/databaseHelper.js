/**
 * Shared promisified database helpers.
 *
 * Most app code uses the promise-style database adapter. Some older tests still
 * mock sqlite-style callback signatures, so these wrappers normalize both.
 */

const db = require('../database/database');

function invokeDb(method, sql, params = []) {
    return new Promise((resolve, reject) => {
        let settled = false;

        const callback = function callback(err, result) {
            if (settled) return;
            settled = true;

            if (err) {
                reject(err);
                return;
            }

            if (result !== undefined) {
                resolve(result);
                return;
            }

            if (this && (this.lastID !== undefined || this.changes !== undefined)) {
                resolve({ lastID: this.lastID, changes: this.changes });
                return;
            }

            resolve(undefined);
        };

        try {
            const returned = db[method](sql, params, callback);

            if (returned && typeof returned.then === 'function') {
                returned.then(
                    (value) => {
                        if (!settled) {
                            settled = true;
                            resolve(value);
                        }
                    },
                    (error) => {
                        if (!settled) {
                            settled = true;
                            reject(error);
                        }
                    }
                );
                return;
            }

            if (returned !== undefined && !settled) {
                settled = true;
                resolve(returned);
            }
        } catch (error) {
            if (!settled) {
                settled = true;
                reject(error);
            }
        }
    });
}

function dbRun(sql, params = []) {
    return invokeDb('run', sql, params);
}

function dbGet(sql, params = []) {
    return invokeDb('get', sql, params);
}

function dbAll(sql, params = []) {
    return invokeDb('all', sql, params);
}

module.exports = { dbRun, dbGet, dbAll };
