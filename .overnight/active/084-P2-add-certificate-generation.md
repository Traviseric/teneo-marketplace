---
id: 84
title: "Add certificate generation to course platform"
priority: P2
severity: high
status: completed
source: feature_audit
file: marketplace/backend/routes/courseRoutes.js
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: course_module
group_reason: "Depends on quiz attempt records from task 083"
---

# Add certificate generation to course platform

**Priority:** P2 (high)
**Source:** feature_audit
**Location:** marketplace/backend/routes/courseRoutes.js, marketplace/backend/services/

## Problem

Course platform claims certificate generation as a feature but no implementation exists. Students who complete a course have no proof of completion they can share or reference. This is a key differentiator vs reading a PDF.

## How to Fix

1. Add to schema:
   ```sql
   CREATE TABLE IF NOT EXISTS course_certificates (
     id TEXT PRIMARY KEY, -- UUID
     course_id INTEGER NOT NULL REFERENCES courses(id),
     user_email TEXT NOT NULL,
     issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     verification_url TEXT,
     UNIQUE(course_id, user_email)
   );
   ```

2. Create `marketplace/backend/services/certificateService.js`:
   - `isEligible(email, courseId)` — checks: all required lessons completed, all required quizzes passed (if quiz module exists)
   - `generateCertificate(email, courseId, courseName, userName)` — creates a certificate record and generates an HTML certificate
   - `getCertificate(certificateId)` — fetches certificate by ID for verification

3. Certificate generation approach (no external PDF lib needed):
   - Generate a nicely formatted HTML page as the certificate
   - Store the HTML in the DB or as a file
   - `GET /api/courses/certificate/:certId` returns the HTML certificate (printable)

4. Add route `POST /api/courses/:slug/claim-certificate`:
   - Check eligibility via `certificateService.isEligible()`
   - If eligible, generate certificate and return certificate URL
   - If not eligible, return list of incomplete requirements

5. Add public verification route `GET /api/verify/certificate/:certId`:
   - Returns certificate details (course name, student name, date) — no email exposed
   - This is the shareable "verify my certificate" URL

## Acceptance Criteria

- [ ] course_certificates table created in schema
- [ ] isEligible() correctly checks lesson completion and quiz pass
- [ ] Certificate generated with student name, course, date, verification URL
- [ ] GET /api/courses/certificate/:id renders printable HTML certificate
- [ ] Public verification URL works without authentication

## Notes

_Generated from feature_audit high-severity finding. Depends on quiz_attempts from task 083 for full eligibility gating._
