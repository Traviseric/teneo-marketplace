---
id: 20
title: "Add server-side price validation in Stripe checkout"
priority: P0
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/checkout.js
line: 10
created: "2026-02-28T06:00:00"
execution_hint: sequential
context_group: checkout_module
group_reason: "Same file and risk area as task 026 (rate limit checkout create-session)"
cwe: CWE-602
---

# Add server-side price validation in Stripe checkout

**Priority:** P0 (high)
**Source:** security_audit
**Location:** marketplace/backend/routes/checkout.js:10

## Problem

The Stripe checkout session is created using the client-supplied `price` value directly, with no server-side validation against the actual book price in the catalog. An attacker can send any arbitrary price (e.g., 0.01) to purchase any book at that price. The price is passed straight to `stripe.checkout.sessions.create()` as `unit_amount: Math.round(price * 100)`.

**Code with issue:**
```javascript
// checkout.js line 10
const { bookId, format, price, bookTitle, bookAuthor, userEmail } = req.body;
// ... price is used directly with no lookup:
unit_amount: Math.round(price * 100),
```

This is a critical business logic vulnerability. Any user who inspects the network request can modify the `price` field and purchase books for $0.01.

## How to Fix

Look up the authoritative price server-side from the catalog using `bookId` and `format` before creating the Stripe session. Never trust price values from the client.

```javascript
// After extracting bookId and format from req.body:
const { bookId, format, bookTitle, bookAuthor, userEmail } = req.body;
// Remove 'price' from destructuring — don't use client price

// Look up authoritative price from catalog
const catalogPath = path.join(__dirname, '../../frontend/brands', /* default brand */ 'default', 'catalog.json');
// OR query from database/brand catalog based on bookId

// Validate price server-side:
const catalogPrice = await lookupBookPrice(bookId, format); // implement this helper
if (!catalogPrice) {
  return res.status(400).json({ success: false, error: 'Book not found' });
}

// Use catalogPrice instead of client-supplied price
unit_amount: Math.round(catalogPrice * 100),
```

The lookup should check the relevant brand's `catalog.json` or the database for the book's price by `bookId` + `format`. If the book is not found, reject the request.

Alternatively (simpler approach): accept the client price but validate it matches the catalog price within a tolerance:
```javascript
const catalogPrice = await lookupBookPrice(bookId, format);
if (Math.abs(price - catalogPrice) > 0.01) {
  return res.status(400).json({ success: false, error: 'Invalid price' });
}
```

## Acceptance Criteria

- [ ] Client-supplied `price` field is no longer trusted directly
- [ ] Price is looked up server-side from the catalog using `bookId` and `format`
- [ ] If bookId is not found in catalog, request is rejected with 400
- [ ] If client price doesn't match catalog price (or price isn't sent), catalog price is used
- [ ] Stripe session is created with the server-authoritative price
- [ ] Existing Stripe checkout flow still works end-to-end
- [ ] Tests added/updated for price validation behavior

## Notes

_Generated from security_audit findings. CWE-602: Client-Side Enforcement of Server-Side Security. This is the highest-impact business logic vulnerability — fix before any public traffic._
