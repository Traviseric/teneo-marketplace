---
id: 47
title: "Extract duplicate saveBookToDatabase/updateBookInDatabase into shared upsertBookFormats() helper"
priority: P3
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/adminRoutes.js
line: 569
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: admin_dashboard
group_reason: "Same adminRoutes.js file as tasks 040 (conversion rate) and 045 (Stripe init)"
---

# Extract duplicate saveBookToDatabase/updateBookInDatabase into shared upsertBookFormats() helper

**Priority:** P3 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/adminRoutes.js:569 and :595

## Problem

`saveBookToDatabase()` (line 569) and `updateBookInDatabase()` (line 595) are near-identical functions that build the same `INSERT OR REPLACE INTO book_formats` SQL with identical column lists and the same `format.price * 0.6` base-cost calculation. The only meaningful difference is the source of `bookId`.

**Code with issue:**
```javascript
// adminRoutes.js line 569 (save):
async function saveBookToDatabase(bookData) {
    // ... same INSERT OR REPLACE INTO book_formats SQL
    // ... same format.price * 0.6 base cost calculation
    // bookId comes from bookData.id
}

// adminRoutes.js line 595 (update):
async function updateBookInDatabase(bookId, bookData) {
    // ... identical INSERT OR REPLACE INTO book_formats SQL
    // ... identical format.price * 0.6 base cost calculation
    // bookId passed as separate parameter
}
```

Copy-paste duplication means any bug fix or schema change must be applied in both places. If someone adds a new column to `book_formats`, they need to remember to update both functions.

## How to Fix

Extract a shared `upsertBookFormats(bookId, formats)` helper and call it from both paths:

```javascript
// Shared helper:
async function upsertBookFormats(bookId, formats) {
    const promises = formats.map(format => {
        return new Promise((resolve, reject) => {
            const baseCost = format.price * 0.6;
            db.run(
                `INSERT OR REPLACE INTO book_formats
                 (book_id, format_type, price, base_cost, ...)
                 VALUES (?, ?, ?, ?, ...)`,
                [bookId, format.type, format.price, baseCost, ...],
                function(err) { err ? reject(err) : resolve(this.lastID); }
            );
        });
    });
    return Promise.all(promises);
}

// saveBookToDatabase() calls the shared helper:
async function saveBookToDatabase(bookData) {
    const bookId = await insertBookRecord(bookData);
    await upsertBookFormats(bookId, bookData.formats || []);
    return bookId;
}

// updateBookInDatabase() calls the same helper:
async function updateBookInDatabase(bookId, bookData) {
    await updateBookRecord(bookId, bookData);
    await upsertBookFormats(bookId, bookData.formats || []);
}
```

Read the actual implementations carefully before refactoring — ensure all columns and parameters are preserved exactly.

## Acceptance Criteria

- [ ] `saveBookToDatabase()` and `updateBookInDatabase()` share the same underlying SQL via a helper
- [ ] No duplicate SQL for book_formats insertion/update
- [ ] Book save functionality works correctly (test via admin dashboard)
- [ ] Book update functionality works correctly (test via admin dashboard)
- [ ] npm test passes after refactor

## Notes

_Generated from code_quality_audit findings. P3 — maintainability refactor, no user-facing behavior change. Bundle with other adminRoutes.js changes in tasks 040 and 045 for efficiency._
