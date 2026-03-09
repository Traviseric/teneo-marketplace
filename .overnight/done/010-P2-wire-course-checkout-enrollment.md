---
id: 10
title: "Wire Stripe course purchase to automatic course enrollment"
priority: P2
severity: medium
status: completed
source: feature_audit
file: marketplace/backend/routes/webhooks.js
line: null
created: "2026-03-06T04:00:00Z"
execution_hint: sequential
context_group: checkout_flow
group_reason: "Touches webhooks.js and courseRoutes.js — same checkout/enrollment area"
---

# Wire Stripe course purchase to automatic course enrollment

**Priority:** P2 (medium)
**Source:** feature_audit
**Location:** `marketplace/backend/routes/webhooks.js`, `marketplace/backend/routes/courseRoutes.js`

## Problem

The course platform backend (`courseRoutes.js`) has full CRUD, enrollment, quizzes, certificates, and progress tracking — but buying a course product via Stripe does NOT grant course access. The Stripe webhook handler processes `checkout.session.completed` events and creates orders, but it never calls the course enrollment endpoint.

A user who pays for a course product gets an order record but cannot access any course content. This is a broken purchase flow for course products.

## How to Fix

1. In `webhooks.js`, in the `checkout.session.completed` handler (after order creation), check if the product has `type: 'course'` or has a `course_id` metadata field:
```js
const session = event.data.object;
const metadata = session.metadata || {};
if (metadata.course_id || metadata.product_type === 'course') {
  // Enroll the buyer
  const enrollResult = await enrollUserInCourse({
    courseId: metadata.course_id,
    userEmail: session.customer_email,
    orderId: newOrderId
  });
}
```
2. In `courseRoutes.js`, expose an internal `enrollUserInCourse(opts)` helper (or reuse the existing `POST /api/courses/:id/enroll` logic) that can be called from the webhook without HTTP overhead.
3. Ensure the enrollment is idempotent — if the webhook fires twice, the user should not get double-enrolled (use `INSERT OR IGNORE` or check existing enrollment first).
4. Add `course_id` to the Stripe checkout session metadata in `checkout.js` when a course product is being purchased.

## Acceptance Criteria

- [ ] Purchasing a course product via Stripe results in automatic course enrollment
- [ ] Enrollment is idempotent (double webhook does not double-enroll)
- [ ] `course_id` is passed as metadata in the Stripe checkout session for course products
- [ ] Webhook handler calls enrollment after order creation for course products
- [ ] Existing webhook tests still pass; add a new test for the course enrollment path

## Notes

_feature_audit finding: "Course checkout integration is incomplete — buying a course product does not grant course access. This is a two-file change (webhooks.js + courseRoutes.js) with high user impact."_
