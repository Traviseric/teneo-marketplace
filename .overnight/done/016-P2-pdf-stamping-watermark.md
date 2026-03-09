---
id: 16
title: "PDF stamping — watermark PDFs with buyer email/name on download"
priority: P2
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/downloadRoutes.js
line: null
created: "2026-03-09T00:00:00"
execution_hint: parallel
context_group: content_protection
group_reason: "Content protection group: tasks 016 is standalone digital product protection feature"
---

# PDF Stamping — Watermark PDFs with Buyer Identity

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 2 Creator Toolkit — Content Protection
**Location:** marketplace/backend/routes/downloadRoutes.js, marketplace/backend/services/

## Problem

Digital PDF products are served via `downloadRoutes.js`. There is no buyer-specific watermarking — if a buyer shares the PDF, there is no way to trace the source. PDF stamping (adding the buyer's name/email as a visible or invisible watermark) is standard protection for digital product creators.

## How to Fix

1. **Dependency**: Add `pdf-lib` (pure JS, no native deps) to `marketplace/backend/package.json`:
   ```bash
   npm install pdf-lib
   ```

2. **Create** `marketplace/backend/services/pdfStampingService.js`:
   ```js
   async function stampPDF(pdfBuffer, buyerEmail, buyerName) {
     // Load PDF with pdf-lib
     // Add text watermark on each page: "Licensed to {buyerEmail}"
     // Use light gray color + rotation for overlay style
     // Return stamped PDF buffer
   }
   ```

3. **Integrate** into `downloadRoutes.js`:
   - After validating the download token, load the PDF file
   - Call `stampPDF(buffer, order.customerEmail, order.customerName)`
   - Serve the stamped buffer instead of the raw file
   - Set `Content-Disposition: attachment; filename="[sanitized-name].pdf"`

4. **Only for PDFs**: Check `path.extname(filePath) === '.pdf'` — skip stamping for other file types (ZIPs, MP4s, etc.)

5. **Caching**: Stamped PDFs should NOT be cached to disk (different per buyer). Stream directly.

6. **Privacy**: Use pseudonymized ID instead of raw email if possible (or truncate: `j***@gmail.com`)

## Acceptance Criteria

- [ ] `pdf-lib` added to package.json
- [ ] `pdfStampingService.stampPDF()` adds visible watermark text to each PDF page
- [ ] `downloadRoutes.js` calls stamping service for `.pdf` files
- [ ] Watermark includes buyer identifier (email or truncated version)
- [ ] Non-PDF files served without modification
- [ ] Stamped PDFs not written to disk (streamed)

## Notes

_Generated from AGENT_TASKS.md Phase 2 Content Protection. Uses pdf-lib (MIT license, no native deps, works in Node.js without system PDF tools)._
