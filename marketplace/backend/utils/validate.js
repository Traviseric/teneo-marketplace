/**
 * Shared input validation utilities.
 */

/**
 * Validate an email address using RFC 5322 simplified rules.
 * Catches malformed addresses like @@, test@, @example.com, test@.com
 * while accepting all real-world valid addresses.
 *
 * @param {*} email - Value to test
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const trimmed = email.trim();
    if (trimmed.length === 0 || trimmed.length > 254) return false;
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmed);
}

/**
 * Return a safe error message for HTTP responses (CWE-209).
 * In production, always returns a generic string so internal details
 * (file paths, SQL fragments, stack traces) are never leaked to clients.
 * Full details are still logged server-side by the caller.
 *
 * @param {Error|*} err
 * @returns {string}
 */
function safeMessage(err) {
    if (process.env.NODE_ENV === 'production') return 'Internal server error';
    return (err && err.message) ? err.message : String(err);
}

module.exports = { isValidEmail, safeMessage };
