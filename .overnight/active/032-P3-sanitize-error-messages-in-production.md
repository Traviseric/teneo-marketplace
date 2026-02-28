---
id: 32
title: "Sanitize error.message in production 500 responses"
priority: P3
severity: medium
status: completed
source: security_audit
file: marketplace/backend/server.js
line: 251
created: "2026-02-28T06:00:00"
execution_hint: long_running
context_group: server_hardening
group_reason: "Spans many files (server.js, checkout.js, adminRoutes.js, etc.) — needs systematic search-replace"
cwe: CWE-209
---

# Sanitize error.message in production 500 responses

**Priority:** P3 (medium severity, but systematic fix across many files)
**Source:** security_audit
**Location:** marketplace/backend/server.js:251 (and throughout checkout.js, adminRoutes.js, etc.)

## Problem

Many route error handlers return `error.message` directly to the client. In production, Node.js errors can contain sensitive information: file paths, database schema details, SQL query fragments, or internal service URLs. This information aids attackers in reconnaissance.

**Code with issue (example from server.js:251):**
```javascript
res.status(500).json({
    success: false,
    error: 'Failed to fetch books',
    message: error.message  // <-- exposes internal error details in production
});
```

Similar patterns exist in checkout.js, adminRoutes.js, and other route files.

## How to Fix

**Option A: Centralized error handler middleware (recommended):**

Add a centralized error handler to server.js that sanitizes errors based on `NODE_ENV`:

```javascript
// server.js — add after all routes, before app.listen:
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;

    // Always log the full error server-side
    console.error('[ERROR]', {
        method: req.method,
        path: req.path,
        error: err.message,
        stack: err.stack
    });

    // Only send error details in development
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: message
    });
});
```

**Option B: Fix inline (simpler, less refactoring):**

For each `catch` block that returns `error.message`, wrap it:

```javascript
// Replace:
res.status(500).json({ success: false, error: 'Failed', message: error.message });

// With:
const safeMessage = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
res.status(500).json({ success: false, error: safeMessage });
```

Use grep to find all instances:
```bash
grep -rn "error\.message" marketplace/backend/routes/ marketplace/backend/server.js
```

Prioritize routes that handle sensitive operations: checkout.js, adminRoutes.js, downloadRoutes.js.

## Acceptance Criteria

- [ ] In production (`NODE_ENV=production`), 500 responses return generic "Internal server error" message
- [ ] In development, full error.message is still returned (for debuggability)
- [ ] Full errors are still logged server-side in all cases
- [ ] All instances of `error.message` in JSON responses are addressed
- [ ] Existing error handling behavior in development mode is preserved

## Notes

_Generated from security_audit findings. CWE-209: Generation of Error Message Containing Sensitive Information. Long-running task because it spans multiple files. Use grep to find all instances first, then fix systematically. Consider using the centralized middleware approach to solve it once for all routes._
