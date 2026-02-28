---
id: 42
title: "Remove hardcoded mock data from digestService.js email digests"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/services/digestService.js
line: 178
created: "2026-02-28T08:00:00"
execution_hint: parallel
context_group: independent
group_reason: "digestService.js is independent of other active tasks"
---

# Remove hardcoded mock data from digestService.js email digests

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/digestService.js:178 (and similar in simpleDigestService.js)

## Problem

`getRisingCategory()` and related functions in `digestService.js` return hardcoded mock data when a DB query fails, rather than omitting the section or failing gracefully. This mock data is included in real email digests sent to users.

**Code with issue:**
```javascript
// digestService.js line 178
} catch (err) {
    console.log('Using mock data...');
    return { category: 'Fiction', book_count: 15, avg_price: 12.99 };
}
```

Similar mock-data fallbacks exist throughout digestService.js (lines 222, 434) and simpleDigestService.js (lines 52, 110).

A user receiving a digest email with "Rising Category: Fiction (15 books)" when that data is fabricated:
1. Misleads the user about marketplace activity
2. Masks database errors (a DB error silently becomes fake success)
3. Erodes trust if users notice the data doesn't change

## How to Fix

Return `null` on DB failure instead of mock data. Let the digest template skip sections when data is unavailable:

```javascript
// digestService.js — replace mock returns with null:
async function getRisingCategory() {
    try {
        const sql = `SELECT category, COUNT(*) as book_count, AVG(price) as avg_price
                     FROM books GROUP BY category ORDER BY book_count DESC LIMIT 1`;
        const result = await dbGet(sql);
        return result || null;
    } catch (err) {
        console.error('getRisingCategory DB error:', err.message);
        return null;  // Let caller handle missing data gracefully
    }
}
```

Update the email template/digest builder to handle `null` sections:
```javascript
// In digest assembly:
if (risingCategory) {
    emailBody += renderRisingCategorySection(risingCategory);
}
// If null, section is simply omitted from the email
```

Apply the same pattern to all mock-data fallbacks in digestService.js and simpleDigestService.js.

## Acceptance Criteria

- [ ] `getRisingCategory()` returns `null` on DB error (not mock Fiction data)
- [ ] All other mock-data fallbacks in digestService.js removed (lines 222, 434)
- [ ] All mock-data fallbacks in simpleDigestService.js removed (lines 52, 110)
- [ ] Digest email assembly skips sections where data is `null`
- [ ] No digest email ever sends fabricated marketplace statistics
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. Sending fake data in automated emails is a trust issue. The fix is simple: return null, skip the section. The email is slightly shorter but factually accurate._
