---
id: 23
title: "Remove hardcoded admin123 DEFAULT_ADMIN_HASH from auth.js"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/middleware/auth.js
line: 23
created: "2026-02-28T06:00:00"
execution_hint: sequential
context_group: auth_module
group_reason: "Auth middleware file — same context as tasks 021, 024"
cwe: CWE-798
---

# Remove hardcoded admin123 DEFAULT_ADMIN_HASH from auth.js

**Priority:** P1 (high)
**Source:** security_audit
**Location:** marketplace/backend/middleware/auth.js:23

## Problem

A hardcoded bcrypt hash for the password 'admin123' is present as the `DEFAULT_ADMIN_HASH` fallback in auth.js. Any attacker who reads the public source code knows to try 'admin123' as the admin password. While server.js generates a hash for 'ChangeMeInProduction2024!' at startup if `ADMIN_PASSWORD_HASH` is unset, the auth.js file still contains this weaker 'admin123' fallback. Additionally, 'ChangeMeInProduction2024!' is explicitly documented in the source code, making it trivially guessable.

**Code with issue:**
```javascript
// auth.js line 23
const DEFAULT_ADMIN_HASH = '$2b$10$8KqG0H5oGX4gRRrqDv7YxeT1Y0fGzFkiOEi7LvJO8QMo6nPBRqGOu'; // 'admin123'
```

If `ADMIN_PASSWORD_HASH` environment variable is not set, this hash (for 'admin123') is used as the fallback. In production environments where the env var is forgotten, the admin account is protected only by the most common test password in existence.

## How to Fix

1. **Remove `DEFAULT_ADMIN_HASH`** entirely from auth.js.
2. **Add a production startup check** that exits the process if `ADMIN_PASSWORD_HASH` is not set in production.
3. **Remove the hardcoded 'ChangeMeInProduction2024!' fallback** from server.js's `validateEnvironment()` or wherever it generates a default hash.

```javascript
// In auth.js — remove DEFAULT_ADMIN_HASH, add validation:
function getAdminPasswordHash() {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
        if (process.env.NODE_ENV === 'production') {
            console.error('FATAL: ADMIN_PASSWORD_HASH must be set in production environment');
            process.exit(1);
        }
        // Development only: log a warning, don't provide a default
        console.warn('WARNING: ADMIN_PASSWORD_HASH not set. Admin login will fail. Run: node scripts/generate-password-hash.js --generate');
        return null; // Return null so login always fails if hash not set
    }
    return hash;
}

// In authenticateAdmin middleware:
const adminHash = getAdminPasswordHash();
if (!adminHash) {
    return res.status(503).json({ success: false, error: 'Admin authentication not configured' });
}
const isValid = await bcrypt.compare(password, adminHash);
```

Also check server.js's `validateEnvironment()` function and remove any code that generates a bcrypt hash for 'ChangeMeInProduction2024!' as a default — this should also fail hard in production.

## Acceptance Criteria

- [ ] `DEFAULT_ADMIN_HASH` constant removed from auth.js
- [ ] No hardcoded password hashes or password strings remain in auth.js
- [ ] Production startup fails with clear error message if `ADMIN_PASSWORD_HASH` is not set
- [ ] Development mode logs a clear warning but does not crash (allows local dev without env setup)
- [ ] Admin login returns 503 (not 401) when hash is not configured, to distinguish "not configured" from "wrong password"
- [ ] 'ChangeMeInProduction2024!' default removed from any server startup code
- [ ] Existing admin login flow still works when `ADMIN_PASSWORD_HASH` is properly set

## Notes

_Generated from security_audit findings. CWE-798: Use of Hard-coded Credentials. The 'admin123' hash is the most commonly guessed password and is in every credential stuffing list. Removing it is a one-line fix with high security impact._
