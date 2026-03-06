const crypto = require('crypto');
const db = require('../database/database');

/**
 * Generate a download token for a completed order and persist it to the database.
 * Replaces the HTTP self-call anti-pattern in checkout.js / cryptoCheckout.js.
 *
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} [params.bookId]   - not stored separately; already on the order row
 * @param {string} [params.userEmail] - not stored separately; already on the order row
 * @returns {Promise<{ token: string, downloadUrl: string }>}
 */
async function generateDownloadToken({ orderId }) {
    const token = crypto.randomBytes(32).toString('hex');
    const downloadExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE orders
             SET download_token = ?,
                 download_expiry = ?,
                 download_count = 0,
                 updated_at = CURRENT_TIMESTAMP
             WHERE order_id = ?`,
            [token, downloadExpiry, orderId],
            function(err) {
                if (err) reject(err);
                else resolve(this);
            }
        );
    });

    return { token, downloadUrl: `/api/download/${token}` };
}

module.exports = { generateDownloadToken };
