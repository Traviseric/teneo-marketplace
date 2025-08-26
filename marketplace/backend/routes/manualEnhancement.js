const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Manual Book Enhancement API
// Smart backup when Amazon API/scraping fails

// POST /api/manual-enhancement/book
// Manual data entry for book enhancement
router.post('/book', async (req, res) => {
    try {
        const {
            asin,
            manual_data: {
                actual_title,
                actual_author,
                bestseller_rank,
                category_rank,
                current_price,
                rating_average,
                rating_count,
                review_count,
                cover_image_url,
                description,
                primary_category,
                publication_date,
                page_count
            },
            source = 'manual_entry',
            notes
        } = req.body;

        if (!asin) {
            return res.status(400).json({
                success: false,
                error: 'ASIN is required'
            });
        }

        // Check if enhancement already exists
        const existingQuery = `
            SELECT id FROM manual_book_enhancements 
            WHERE asin = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const existing = await db.get(existingQuery, [asin]);

        if (existing) {
            // Update existing record
            const updateQuery = `
                UPDATE manual_book_enhancements 
                SET actual_title = ?, actual_author = ?, bestseller_rank = ?,
                    category_rank = ?, current_price = ?, rating_average = ?,
                    rating_count = ?, review_count = ?, cover_image_url = ?,
                    description = ?, primary_category = ?, publication_date = ?,
                    page_count = ?, source = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            await db.run(updateQuery, [
                actual_title, actual_author, bestseller_rank, category_rank,
                current_price, rating_average, rating_count, review_count,
                cover_image_url, description, primary_category, publication_date,
                page_count, source, notes, existing.id
            ]);

            return res.json({
                success: true,
                message: 'Book enhancement updated successfully',
                enhancement_id: existing.id,
                action: 'updated'
            });
        } else {
            // Create new record
            const insertQuery = `
                INSERT INTO manual_book_enhancements (
                    asin, actual_title, actual_author, bestseller_rank,
                    category_rank, current_price, rating_average, rating_count,
                    review_count, cover_image_url, description, primary_category,
                    publication_date, page_count, source, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await db.run(insertQuery, [
                asin, actual_title, actual_author, bestseller_rank,
                category_rank, current_price, rating_average, rating_count,
                review_count, cover_image_url, description, primary_category,
                publication_date, page_count, source, notes
            ]);

            return res.json({
                success: true,
                message: 'Book enhancement created successfully',
                enhancement_id: result.lastID,
                action: 'created'
            });
        }

    } catch (error) {
        console.error('Error creating/updating manual enhancement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process manual enhancement'
        });
    }
});

// GET /api/manual-enhancement/book/:asin
// Get enhanced data for a specific ASIN
router.get('/book/:asin', async (req, res) => {
    try {
        const { asin } = req.params;

        const query = `
            SELECT * FROM manual_book_enhancements 
            WHERE asin = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        
        const enhancement = await db.get(query, [asin]);

        if (!enhancement) {
            return res.status(404).json({
                success: false,
                error: 'No manual enhancement found for this ASIN',
                suggestion: 'Consider adding manual data for this book'
            });
        }

        res.json({
            success: true,
            data: {
                asin: enhancement.asin,
                enhanced_data: {
                    title: enhancement.actual_title,
                    author: enhancement.actual_author,
                    bestseller_rank: enhancement.bestseller_rank,
                    category_rank: enhancement.category_rank,
                    current_price: enhancement.current_price,
                    rating_average: enhancement.rating_average,
                    rating_count: enhancement.rating_count,
                    review_count: enhancement.review_count,
                    cover_image_url: enhancement.cover_image_url,
                    description: enhancement.description,
                    primary_category: enhancement.primary_category,
                    publication_date: enhancement.publication_date,
                    page_count: enhancement.page_count
                },
                metadata: {
                    source: enhancement.source,
                    notes: enhancement.notes,
                    last_updated: enhancement.updated_at || enhancement.created_at
                }
            }
        });

    } catch (error) {
        console.error('Error fetching manual enhancement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch enhancement data'
        });
    }
});

// GET /api/manual-enhancement/books
// List all manually enhanced books
router.get('/books', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            source = 'all',
            has_ranking = 'all'
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereClauses = [];
        let params = [];
        
        if (source !== 'all') {
            whereClauses.push('source = ?');
            params.push(source);
        }
        
        if (has_ranking === 'yes') {
            whereClauses.push('bestseller_rank IS NOT NULL');
        } else if (has_ranking === 'no') {
            whereClauses.push('bestseller_rank IS NULL');
        }
        
        const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
        
        const query = `
            SELECT asin, actual_title, actual_author, bestseller_rank,
                   current_price, rating_average, rating_count,
                   source, created_at, updated_at
            FROM manual_book_enhancements 
            ${whereClause}
            ORDER BY COALESCE(updated_at, created_at) DESC
            LIMIT ? OFFSET ?
        `;
        
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM manual_book_enhancements 
            ${whereClause}
        `;
        
        const [books, totalResult] = await Promise.all([
            db.all(query, [...params, parseInt(limit), offset]),
            db.get(countQuery, params)
        ]);
        
        res.json({
            success: true,
            data: {
                books,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalResult.total,
                    pages: Math.ceil(totalResult.total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error fetching enhanced books list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch enhanced books'
        });
    }
});

// POST /api/manual-enhancement/batch
// Batch update multiple books (for Travis to quickly add data)
router.post('/batch', async (req, res) => {
    try {
        const { books } = req.body;

        if (!Array.isArray(books) || books.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Books array is required'
            });
        }

        const results = [];
        const errors = [];

        for (const bookData of books) {
            try {
                const {
                    asin,
                    actual_title,
                    bestseller_rank,
                    current_price,
                    rating_average,
                    rating_count
                } = bookData;

                if (!asin) {
                    errors.push({ asin: 'unknown', error: 'ASIN is required' });
                    continue;
                }

                const insertQuery = `
                    INSERT OR REPLACE INTO manual_book_enhancements (
                        asin, actual_title, bestseller_rank, current_price,
                        rating_average, rating_count, source
                    ) VALUES (?, ?, ?, ?, ?, ?, 'batch_entry')
                `;

                const result = await db.run(insertQuery, [
                    asin, actual_title, bestseller_rank, current_price,
                    rating_average, rating_count
                ]);

                results.push({
                    asin,
                    title: actual_title,
                    status: 'success',
                    id: result.lastID
                });

            } catch (bookError) {
                errors.push({
                    asin: bookData.asin || 'unknown',
                    error: bookError.message
                });
            }
        }

        res.json({
            success: true,
            message: `Processed ${books.length} books`,
            results: {
                successful: results.length,
                failed: errors.length,
                details: results
            },
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error processing batch enhancement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process batch enhancement'
        });
    }
});

module.exports = router;