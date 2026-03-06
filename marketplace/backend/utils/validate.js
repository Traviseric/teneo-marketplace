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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
    // Mask errors unless EXPOSE_ERRORS=true is explicitly set.
    // Staging deployments omit EXPOSE_ERRORS to match production behaviour (CWE-209).
    const isSecureEnv = process.env.NODE_ENV === 'production' || !process.env.EXPOSE_ERRORS;
    if (isSecureEnv) return 'Internal server error';
    return (err && err.message) ? err.message : String(err);
}

/**
 * Sanitize a value for use as Stripe metadata.
 * Returns null for falsy / non-string values; trims and truncates to maxLength.
 *
 * @param {*} value
 * @param {number} maxLength
 * @returns {string|null}
 */
function sanitizeMetadataValue(value, maxLength = 120) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
}

module.exports = { isValidEmail, safeMessage, sanitizeMetadataValue };
