# Digital Book Storage

This directory contains PDF files for digital book delivery.

## Directory Structure

```
books/
├── teneo/              # Teneo brand books
│   ├── consciousness-revolution.pdf
│   ├── pattern-code.pdf
│   └── ...
├── true-earth/         # True Earth brand books  
│   ├── tartaria-unveiled.pdf
│   ├── mudflood-conspiracy.pdf
│   └── ...
├── wealth-wise/        # WealthWise brand books
│   ├── wealth-transfer-code.pdf
│   ├── market-psychology.pdf
│   └── ...
└── README.md
```

## Important Notes

1. **Demo Purpose**: In the MVP, these are placeholder directories. Add actual PDF files when ready.

2. **Security**: In production, books should be stored in:
   - Amazon S3 with signed URLs
   - Protected server directory with token-based access
   - CDN with authentication

3. **File Naming**: Use the book ID from catalog.json as the filename:
   - `consciousness-revolution.pdf`
   - `wealth-transfer-code.pdf`

4. **Access Control**: The delivery.js system manages:
   - Download limits (5 per purchase)
   - Expiration dates (30 days)
   - Token verification

## Adding Books

To add a new book:

1. Place the PDF in the appropriate brand folder
2. Use the book ID as the filename
3. Update the catalog.json with the correct digitalFile path
4. Test the download through the delivery system

## Production Migration

When moving to production:

1. Upload PDFs to secure cloud storage
2. Update delivery.js to use signed URLs
3. Implement server-side verification
4. Add DRM if required
5. Set up CDN for global delivery