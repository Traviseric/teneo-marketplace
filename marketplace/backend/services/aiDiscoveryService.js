/**
 * AI Discovery Service
 *
 * Revolutionary semantic search engine that:
 * - Surfaces suppressed/controversial books
 * - Understands natural language queries
 * - Builds knowledge graphs and reading paths
 * - Turns censorship into marketing
 */

const db = require('../database/database');

class AIDiscoveryService {
    constructor() {
        this.openai = null;
        this.embeddingModel = 'text-embedding-3-small';
        this.embeddingDimensions = 1536;

        if (!process.env.OPENAI_API_KEY) {
            console.warn('[AI Discovery] OPENAI_API_KEY not set — using keyword search fallback. Set the key to enable semantic search.');
        }
    }

    /**
     * Initialize OpenAI client (lazy loading)
     * @returns {boolean} true if OpenAI is available, false otherwise
     */
    _initOpenAI() {
        if (this.openai) return true;
        if (!process.env.OPENAI_API_KEY) return false;
        try {
            const OpenAI = require('openai');
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            return true;
        } catch (e) {
            console.warn('⚠️  openai package not installed — AI discovery using keyword fallback');
            return false;
        }
    }

    /**
     * Keyword-based search fallback when OpenAI is unavailable
     * @param {string} query - Search query
     * @param {number} limit - Max results
     * @returns {Promise<Array>} Search results
     */
    async _keywordSearch(query, limit = 20) {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const likeClause = terms.map(() => '(LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(description) LIKE ?)').join(' OR ');
        const params = terms.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`]);

        const books = await db.all(
            `SELECT book_id as bookId, brand, title, author, description, category
             FROM book_embeddings
             WHERE ${likeClause || '1=1'}
             LIMIT ?`,
            [...params, limit]
        );

        return books.map(b => ({ ...b, score: 0.5, matchReason: 'keyword_match' }));
    }

    /**
     * Generate embedding for a book
     * @param {Object} book - Book object with title, author, description
     * @returns {Promise<Array<number>>} Embedding vector
     */
    async generateBookEmbedding(book) {
        try {
            this._initOpenAI();

            // Combine book metadata into rich text for embedding
            const textToEmbed = this.prepareBookText(book);

            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: textToEmbed,
                dimensions: this.embeddingDimensions
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error(`Error generating embedding for book ${book.id}:`, error);
            throw error;
        }
    }

    /**
     * Prepare book text for embedding
     * @param {Object} book - Book object
     * @returns {string} Combined text optimized for semantic search
     */
    prepareBookText(book) {
        const parts = [];

        // Title (most important)
        if (book.title) {
            parts.push(`Title: ${book.title}`);
        }

        // Author
        if (book.author) {
            parts.push(`Author: ${book.author}`);
        }

        // Category/topic
        if (book.category) {
            parts.push(`Category: ${book.category}`);
        }

        // Description (key for semantic understanding)
        if (book.longDescription) {
            parts.push(`Description: ${book.longDescription}`);
        } else if (book.description) {
            parts.push(`Description: ${book.description}`);
        }

        // Badge (indicates special status)
        if (book.badge) {
            parts.push(`Badge: ${book.badge}`);
        }

        return parts.join('\n');
    }

    /**
     * Queue all books from all brands for embedding generation
     * @returns {Promise<number>} Number of books queued
     */
    async queueAllBooksForEmbedding() {
        const fs = require('fs').promises;
        const path = require('path');

        const brandsDir = path.join(__dirname, '../../frontend/brands');
        let queuedCount = 0;

        try {
            const brandDirs = await fs.readdir(brandsDir);

            for (const brand of brandDirs) {
                const catalogPath = path.join(brandsDir, brand, 'catalog.json');

                try {
                    const catalogData = await fs.readFile(catalogPath, 'utf8');
                    const catalog = JSON.parse(catalogData);

                    if (catalog.books && Array.isArray(catalog.books)) {
                        for (const book of catalog.books) {
                            const contentToEmbed = this.prepareBookText(book);

                            // Add to queue
                            await db.run(`
                                INSERT OR REPLACE INTO embedding_generation_queue
                                (book_id, brand, content_to_embed, status, queued_at)
                                VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
                            `, [book.id, brand, contentToEmbed]);

                            queuedCount++;
                        }
                    }
                } catch (error) {
                    console.error(`Error processing brand ${brand}:`, error.message);
                    // Continue with next brand
                }
            }

            console.log(`✅ Queued ${queuedCount} books for embedding generation`);
            return queuedCount;

        } catch (error) {
            console.error('Error queuing books:', error);
            throw error;
        }
    }

    /**
     * Process embedding queue (run as background job)
     * @param {number} batchSize - Number of books to process
     * @returns {Promise<Object>} Processing results
     */
    async processEmbeddingQueue(batchSize = 10) {
        const results = {
            processed: 0,
            failed: 0,
            errors: []
        };

        try {
            // Get pending books
            const pendingBooks = await db.all(`
                SELECT * FROM embedding_generation_queue
                WHERE status = 'pending'
                ORDER BY queued_at ASC
                LIMIT ?
            `, [batchSize]);

            for (const queueItem of pendingBooks) {
                try {
                    // Mark as processing
                    await db.run(`
                        UPDATE embedding_generation_queue
                        SET status = 'processing'
                        WHERE id = ?
                    `, [queueItem.id]);

                    // Generate embedding
                    const book = {
                        id: queueItem.book_id,
                        // Parse the content back (simple approach)
                        title: queueItem.content_to_embed.match(/Title: (.*)/)?.[1],
                        author: queueItem.content_to_embed.match(/Author: (.*)/)?.[1],
                        description: queueItem.content_to_embed.match(/Description: (.*)/)?.[1]
                    };

                    const embedding = await this.generateBookEmbedding(book);

                    // Store embedding
                    await db.run(`
                        INSERT OR REPLACE INTO book_embeddings
                        (book_id, brand, title, author, description, long_description, category,
                         embedding_vector, embedding_model, generated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `, [
                        queueItem.book_id,
                        queueItem.brand,
                        book.title || '',
                        book.author || '',
                        book.description || '',
                        book.description || '',
                        '', // category extracted separately
                        JSON.stringify(embedding),
                        this.embeddingModel
                    ]);

                    // Mark as completed
                    await db.run(`
                        UPDATE embedding_generation_queue
                        SET status = 'completed', processed_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [queueItem.id]);

                    results.processed++;
                    console.log(`✅ Generated embedding for: ${book.title}`);

                } catch (error) {
                    console.error(`❌ Failed to process ${queueItem.book_id}:`, error.message);

                    // Mark as failed
                    await db.run(`
                        UPDATE embedding_generation_queue
                        SET status = 'failed',
                            error_message = ?,
                            retry_count = retry_count + 1
                        WHERE id = ?
                    `, [error.message, queueItem.id]);

                    results.failed++;
                    results.errors.push({
                        bookId: queueItem.book_id,
                        error: error.message
                    });
                }

                // Rate limiting: OpenAI allows 3,000 RPM for tier 1
                // Sleep 200ms between requests to stay under limit
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            return results;

        } catch (error) {
            console.error('Error processing embedding queue:', error);
            throw error;
        }
    }

    /**
     * Semantic search using vector similarity
     * @param {string} query - Natural language search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Ranked search results
     */
    async semanticSearch(query, options = {}) {
        const {
            limit = 20,
            controversyBoost = true,
            suppressionBoost = true,
            minScore = 0.6
        } = options;

        const hasOpenAI = this._initOpenAI();

        if (!hasOpenAI) {
            console.warn('⚠️  AI Discovery: OpenAI unavailable, using keyword fallback for query:', query);
            return this._keywordSearch(query, limit);
        }

        try {
            const searchStart = Date.now();

            // Generate embedding for search query
            const queryEmbedding = await this.generateQueryEmbedding(query);

            // Get all book embeddings
            const allBooks = await db.all(`
                SELECT
                    book_id,
                    brand,
                    title,
                    author,
                    description,
                    category,
                    embedding_vector,
                    controversy_score,
                    suppression_level,
                    danger_index,
                    search_weight
                FROM book_embeddings
            `);

            // Calculate cosine similarity for each book
            const results = allBooks.map(book => {
                const bookEmbedding = JSON.parse(book.embedding_vector);
                const similarity = this.cosineSimilarity(queryEmbedding, bookEmbedding);

                // Apply controversy boost
                let finalScore = similarity;
                if (controversyBoost && book.controversy_score > 50) {
                    finalScore *= (1 + (book.controversy_score / 100) * 0.2); // Up to 20% boost
                }

                // Apply suppression boost
                if (suppressionBoost && book.suppression_level > 50) {
                    finalScore *= (1 + (book.suppression_level / 100) * 0.3); // Up to 30% boost
                }

                // Apply search weight
                finalScore *= (book.search_weight || 1.0);

                return {
                    bookId: book.book_id,
                    brand: book.brand,
                    title: book.title,
                    author: book.author,
                    description: book.description,
                    category: book.category,
                    similarityScore: similarity,
                    boostedScore: finalScore,
                    controversyScore: book.controversy_score,
                    suppressionLevel: book.suppression_level,
                    dangerIndex: book.danger_index
                };
            });

            // Filter by minimum score and sort by boosted score
            const filtered = results
                .filter(r => r.similarityScore >= minScore)
                .sort((a, b) => b.boostedScore - a.boostedScore)
                .slice(0, limit);

            // Log search for analytics
            const duration = Date.now() - searchStart;
            await this.logSearch(query, filtered, duration);

            return filtered;

        } catch (error) {
            console.error('Semantic search failed, falling back to keyword search:', error.message);
            return this._keywordSearch(query, limit);
        }
    }

    /**
     * Generate embedding for search query
     * @param {string} query - Search query
     * @returns {Promise<Array<number>>} Query embedding
     */
    async generateQueryEmbedding(query) {
        try {
            this._initOpenAI();

            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: query,
                dimensions: this.embeddingDimensions
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('Error generating query embedding:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array<number>} vecA - First vector
     * @param {Array<number>} vecB - Second vector
     * @returns {number} Similarity score (0-1)
     */
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Calculate controversy score for a book
     * @param {Object} book - Book object
     * @returns {Promise<number>} Controversy score (0-100)
     */
    async calculateControversyScore(bookId) {
        let score = 0;

        try {
            // Check suppression events
            const suppressionEvents = await db.all(`
                SELECT COUNT(*) as count, SUM(impact_score) as total_impact
                FROM book_suppression_events
                WHERE book_id = ? AND is_active = 1
            `, [bookId]);

            if (suppressionEvents[0]) {
                // Each suppression event adds points
                score += Math.min(suppressionEvents[0].count * 10, 40);
                // Impact adds more points
                score += Math.min((suppressionEvents[0].total_impact || 0) / 10, 30);
            }

            // Check controversy metrics
            const recentMetrics = await db.get(`
                SELECT
                    AVG(daily_controversy_score) as avg_score,
                    SUM(media_attacks) as attacks,
                    SUM(government_inquiries) as inquiries
                FROM book_controversy_metrics
                WHERE book_id = ?
                AND date >= date('now', '-30 days')
            `, [bookId]);

            if (recentMetrics) {
                score += (recentMetrics.avg_score || 0) * 0.3;
                score += Math.min((recentMetrics.attacks || 0) * 5, 20);
                score += Math.min((recentMetrics.inquiries || 0) * 10, 10);
            }

            // Cap at 100
            return Math.min(Math.round(score), 100);

        } catch (error) {
            console.error(`Error calculating controversy score for ${bookId}:`, error);
            return 0;
        }
    }

    /**
     * Generate AI-powered reading path
     * @param {string} topic - Topic or learning goal
     * @param {string} level - Difficulty level
     * @returns {Promise<Object>} Reading path
     */
    async generateReadingPath(topic, level = 'beginner') {
        try {
            // Get books related to topic using semantic search
            const relatedBooks = await this.semanticSearch(topic, {
                limit: 50,
                controversyBoost: false
            });

            if (relatedBooks.length === 0) {
                return null;
            }

            // Use Claude to generate optimal reading path
            const bookList = relatedBooks.map(b =>
                `- "${b.title}" by ${b.author}: ${b.description}`
            ).join('\n');

            this._initOpenAI();

            const prompt = `You are an expert curator creating a learning path on "${topic}" for ${level} readers.

Available books:
${bookList}

Create an optimal reading path that:
1. Starts with foundational concepts
2. Progressively builds knowledge
3. Ends with advanced understanding

Return a JSON object with:
{
    "name": "Path name",
    "description": "Why this sequence works",
    "books": ["book-id-1", "book-id-2", ...],
    "learning_goals": ["goal1", "goal2", ...],
    "estimated_hours": 40
}

Return ONLY the JSON object, no other text.`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            });

            const pathData = JSON.parse(response.choices[0].message.content);

            // Store reading path
            const pathId = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await db.run(`
                INSERT INTO reading_paths
                (path_id, name, description, topic, difficulty_level, estimated_hours,
                 book_sequence, learning_goals, created_by, is_featured)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ai', 0)
            `, [
                pathId,
                pathData.name,
                pathData.description,
                topic,
                level,
                pathData.estimated_hours,
                JSON.stringify(pathData.books),
                JSON.stringify(pathData.learning_goals)
            ]);

            return {
                pathId,
                ...pathData
            };

        } catch (error) {
            console.error('Error generating reading path:', error);
            throw error;
        }
    }

    /**
     * Get "What They Don't Want You to Read" feed
     * @param {number} limit - Number of books to return
     * @returns {Promise<Array>} Suppressed/controversial books
     */
    async getSuppressedBooksFeed(limit = 20) {
        try {
            const suppressedBooks = await db.all(`
                SELECT
                    be.*,
                    COUNT(DISTINCT bse.id) as suppression_count,
                    MAX(bse.impact_score) as max_impact
                FROM book_embeddings be
                LEFT JOIN book_suppression_events bse ON be.book_id = bse.book_id
                WHERE bse.is_active = 1
                GROUP BY be.book_id
                ORDER BY suppression_count DESC, be.danger_index DESC, max_impact DESC
                LIMIT ?
            `, [limit]);

            return suppressedBooks.map(book => ({
                bookId: book.book_id,
                brand: book.brand,
                title: book.title,
                author: book.author,
                description: book.description,
                dangerIndex: book.danger_index,
                suppressionCount: book.suppression_count,
                maxImpact: book.max_impact
            }));

        } catch (error) {
            console.error('Error getting suppressed books feed:', error);
            throw error;
        }
    }

    /**
     * Log search for analytics
     * @param {string} query - Search query
     * @param {Array} results - Search results
     * @param {number} durationMs - Actual search duration in milliseconds
     */
    async logSearch(query, results, durationMs = 0) {
        try {
            await db.run(`
                INSERT INTO semantic_search_log
                (search_query, results_count, top_result_book_id, search_duration_ms)
                VALUES (?, ?, ?, ?)
            `, [
                query,
                results.length,
                results[0]?.bookId || null,
                durationMs
            ]);
        } catch (error) {
            console.error('Error logging search:', error);
            // Don't throw - logging failure shouldn't break search
        }
    }
}

module.exports = new AIDiscoveryService();
