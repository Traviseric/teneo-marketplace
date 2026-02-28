---
id: 21
title: "Fix course enrollment auth bypass (email-only to session-based)"
priority: P0
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/courseRoutes.js
line: 121
created: "2026-02-28T06:00:00"
execution_hint: sequential
context_group: auth_module
group_reason: "Auth middleware pattern shared with tasks 023, 024"
cwe: CWE-287
---

# Fix course enrollment auth bypass (email-only to session-based)

**Priority:** P0 (high)
**Source:** security_audit
**Location:** marketplace/backend/routes/courseRoutes.js:121

## Problem

Course enrollment authentication only checks for an email address in query params or body — no session, no token, no cryptographic proof of identity. Anyone who knows the email address of an enrolled user can access all paid course content by passing `?email=victim@example.com`. This is a trivial auth bypass for all enrolled course content.

**Code with issue:**
```javascript
async function requireEnrollment(req, res, next) {
    const email = req.query.email || req.body.email;
    if (!email) return res.status(401).json(...);
    ...
    const enrollment = await dbGet(
      'SELECT * FROM course_enrollments WHERE course_id = ? AND user_email = ?',
      [course.id, email.toLowerCase()]
    );
```

The comment `// Middleware: check enrollment (expects ?email= query param for MVP)` indicates this was always meant to be temporary. It must be replaced before launch.

## How to Fix

Replace the email-only check with proper session-based authentication. Require the user to be logged in via `req.session.isAuthenticated` and verify `req.session.email` matches the enrollment:

```javascript
async function requireEnrollment(req, res, next) {
    // Step 1: Require active session (user must be logged in)
    if (!req.session || !req.session.isAuthenticated || !req.session.email) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Please log in to access course content.'
        });
    }

    const email = req.session.email; // Use session email, NOT query param

    // Step 2: Check enrollment in database
    const slug = req.params.slug;
    const course = await dbGet('SELECT * FROM courses WHERE slug = ?', [slug]);
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    const enrollment = await dbGet(
        'SELECT * FROM course_enrollments WHERE course_id = ? AND user_email = ?',
        [course.id, email.toLowerCase()]
    );

    if (!enrollment) {
        return res.status(403).json({
            success: false,
            error: 'Not enrolled in this course'
        });
    }

    req.enrollment = enrollment;
    req.course = course;
    next();
}
```

Also remove the `?email=` query parameter from all route paths that use this middleware — the email now comes from the session exclusively.

## Acceptance Criteria

- [ ] `requireEnrollment` middleware checks `req.session.isAuthenticated` before proceeding
- [ ] `req.session.email` is used for enrollment lookup — not `req.query.email` or `req.body.email`
- [ ] Unauthenticated requests return 401 (not just "email not found" 403)
- [ ] Enrolled routes no longer accept `?email=` as an auth mechanism
- [ ] Tests verify that access without session is blocked even if email is known
- [ ] Tests verify that session-authenticated enrolled users can access course content

## Notes

_Generated from security_audit findings. CWE-287: Improper Authentication. This bypasses the entire enrollment paywall — any attacker with a victim's email address can access all purchased course content without paying._
