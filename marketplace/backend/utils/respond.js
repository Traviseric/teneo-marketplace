/**
 * Shared HTTP response helpers — ensures consistent {success, error} shape.
 * Every error response must include success: false so frontend code can
 * check a single field rather than testing for multiple shapes.
 */

function sendError(res, statusCode, message, extra = {}) {
    return res.status(statusCode).json({ success: false, error: message, ...extra });
}

function sendSuccess(res, data = {}) {
    return res.json({ success: true, ...data });
}

module.exports = { sendError, sendSuccess };
