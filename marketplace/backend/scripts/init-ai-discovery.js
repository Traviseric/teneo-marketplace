/**
 * AI Discovery Initialization Script
 *
 * This script sets up the AI Discovery Engine:
 * 1. Creates database tables
 * 2. Queues all books for embedding generation
 * 3. Processes initial batch of embeddings
 */

require('dotenv').config();
const aiDiscoveryService = require('../services/aiDiscoveryService');
const db = require('../database/database');

async function initializeAIDiscovery() {
    console.log('\n🚀 Initializing AI Discovery Engine...\n');

    try {
        // Step 1: Verify database tables exist
        console.log('Step 1: Verifying database schema...');
        const tables = await db.all(`
            SELECT name FROM sqlite_master
            WHERE type='table'
            AND name LIKE '%embedding%'
            OR name LIKE '%discovery%'
            OR name LIKE '%suppression%'
        `);

        console.log(`✅ Found ${tables.length} AI Discovery tables:`);
        tables.forEach(t => console.log(`   - ${t.name}`));

        // Step 2: Queue all books for embedding generation
        console.log('\nStep 2: Queuing books for embedding generation...');
        const queuedCount = await aiDiscoveryService.queueAllBooksForEmbedding();
        console.log(`✅ Queued ${queuedCount} books for embedding generation`);

        // Step 3: Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            console.log('\n⚠️  WARNING: OPENAI_API_KEY not found in environment variables');
            console.log('   Please add OPENAI_API_KEY to your .env file to enable embedding generation');
            console.log('   Example: OPENAI_API_KEY=sk-...');
            console.log('\n   You can still use the system without embeddings, but semantic search will not work.');
            return;
        }

        // Step 4: Process first batch of embeddings
        console.log('\nStep 3: Processing initial batch of embeddings (10 books)...');
        console.log('   This may take 30-60 seconds depending on OpenAI API speed...');

        const results = await aiDiscoveryService.processEmbeddingQueue(10);

        console.log(`\n✅ Processing complete!`);
        console.log(`   - Successfully processed: ${results.processed}`);
        console.log(`   - Failed: ${results.failed}`);

        if (results.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            results.errors.forEach(e => {
                console.log(`   - ${e.bookId}: ${e.error}`);
            });
        }

        // Step 5: Get queue status
        console.log('\nStep 4: Checking queue status...');
        const queueStatus = await db.get(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM embedding_generation_queue
        `);

        console.log(`\n📊 Queue Status:`);
        console.log(`   - Total: ${queueStatus.total}`);
        console.log(`   - Pending: ${queueStatus.pending}`);
        console.log(`   - Completed: ${queueStatus.completed}`);
        console.log(`   - Failed: ${queueStatus.failed}`);

        // Step 6: Instructions for next steps
        console.log('\n\n✨ AI Discovery Engine initialized successfully!\n');
        console.log('📝 Next Steps:');
        console.log('   1. Process remaining embeddings:');
        console.log('      node marketplace/backend/scripts/process-embeddings.js');
        console.log('\n   2. Or process all at once (may take several minutes):');
        console.log('      node marketplace/backend/scripts/process-all-embeddings.js');
        console.log('\n   3. Start using semantic search in your app!');
        console.log('      POST /api/discovery/semantic-search');
        console.log('      { "query": "books about institutional corruption" }');
        console.log('\n   4. View suppressed books feed:');
        console.log('      GET /api/discovery/suppressed-books');
        console.log('\n💡 Tip: Run the embedding processor as a background job to process all books.');
        console.log('   This will enable full semantic search capabilities.\n');

    } catch (error) {
        console.error('\n❌ Error initializing AI Discovery:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run initialization
initializeAIDiscovery()
    .then(() => {
        console.log('✅ Initialization complete\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
