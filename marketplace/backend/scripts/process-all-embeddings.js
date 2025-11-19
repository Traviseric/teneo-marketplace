/**
 * Process All Embeddings
 *
 * Processes the entire embedding queue.
 * This script will run until all books have embeddings generated.
 */

require('dotenv').config();
const aiDiscoveryService = require('../services/aiDiscoveryService');
const db = require('../database/db');

async function processAllEmbeddings() {
    console.log('\n🔄 Processing all embeddings...\n');

    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ ERROR: OPENAI_API_KEY not found in environment variables');
        console.error('   Please add OPENAI_API_KEY to your .env file');
        process.exit(1);
    }

    try {
        let totalProcessed = 0;
        let totalFailed = 0;
        let iteration = 0;

        while (true) {
            iteration++;

            // Get pending count
            const pendingCount = await db.get(`
                SELECT COUNT(*) as count
                FROM embedding_generation_queue
                WHERE status = 'pending'
            `);

            if (pendingCount.count === 0) {
                console.log('\n✅ All embeddings processed!');
                break;
            }

            console.log(`\n📦 Batch ${iteration}: Processing ${Math.min(10, pendingCount.count)} books...`);
            console.log(`   Remaining in queue: ${pendingCount.count}`);

            // Process batch
            const results = await aiDiscoveryService.processEmbeddingQueue(10);

            totalProcessed += results.processed;
            totalFailed += results.failed;

            console.log(`   ✅ Processed: ${results.processed}`);
            if (results.failed > 0) {
                console.log(`   ❌ Failed: ${results.failed}`);
            }

            // Progress bar
            const completedCount = await db.get(`
                SELECT COUNT(*) as count
                FROM embedding_generation_queue
                WHERE status = 'completed'
            `);

            const totalCount = await db.get(`
                SELECT COUNT(*) as count FROM embedding_generation_queue
            `);

            const progress = Math.round((completedCount.count / totalCount.count) * 100);
            const progressBar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2));

            console.log(`   Progress: [${progressBar}] ${progress}%`);

            // Rate limiting: OpenAI tier 1 allows 3,000 RPM
            // We process 10 books per batch, so wait 1 second between batches
            if (pendingCount.count > 0) {
                console.log('   Waiting 1 second (rate limiting)...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Final statistics
        console.log('\n\n📊 Processing Complete!');
        console.log(`   Total Processed: ${totalProcessed}`);
        console.log(`   Total Failed: ${totalFailed}`);

        const embeddingCount = await db.get(`
            SELECT COUNT(*) as count FROM book_embeddings
        `);

        console.log(`   Total Embeddings in Database: ${embeddingCount.count}`);

        // Show any failed books
        if (totalFailed > 0) {
            const failedBooks = await db.all(`
                SELECT book_id, error_message
                FROM embedding_generation_queue
                WHERE status = 'failed'
                LIMIT 10
            `);

            console.log('\n⚠️  Failed Books (first 10):');
            failedBooks.forEach(b => {
                console.log(`   - ${b.book_id}: ${b.error_message}`);
            });
        }

        console.log('\n✨ AI Discovery Engine is ready!');
        console.log('\n🎯 You can now:');
        console.log('   - Use semantic search: POST /api/discovery/semantic-search');
        console.log('   - Generate reading paths: POST /api/discovery/reading-path');
        console.log('   - View suppressed books: GET /api/discovery/suppressed-books\n');

    } catch (error) {
        console.error('\n❌ Error processing embeddings:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run processing
processAllEmbeddings()
    .then(() => {
        console.log('✅ Processing complete\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
