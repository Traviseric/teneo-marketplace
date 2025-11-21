/**
 * Censorship Tracker Initialization Script
 *
 * Sets up the Live Censorship Tracker:
 * 1. Creates database tables
 * 2. Adds books to monitoring
 * 3. Runs initial availability check
 */

require('dotenv').config();
const censorshipTracker = require('../services/censorshipTrackerService');
const db = require('../database/database');
const fs = require('fs').promises;
const path = require('path');

async function initializeCensorshipTracker() {
    console.log('\n🔥 Initializing Live Censorship Tracker...\n');

    try {
        // Step 1: Verify database tables
        console.log('Step 1: Verifying database schema...');
        const tables = await db.all(`
            SELECT name FROM sqlite_master
            WHERE type='table'
            AND (
                name LIKE '%monitor%'
                OR name LIKE '%censorship%'
                OR name LIKE '%wayback%'
                OR name LIKE '%alert%'
            )
        `);

        console.log(`✅ Found ${tables.length} censorship tracking tables:`);
        tables.forEach(t => console.log(`   - ${t.name}`));

        // Step 2: Add books to monitoring
        console.log('\nStep 2: Adding books to monitoring...');

        const brandsDir = path.join(__dirname, '../../frontend/brands');
        const brandDirs = await fs.readdir(brandsDir);

        let booksAdded = 0;

        for (const brand of brandDirs) {
            const catalogPath = path.join(brandsDir, brand, 'catalog.json');

            try {
                const catalogData = await fs.readFile(catalogPath, 'utf8');
                const catalog = JSON.parse(catalogData);

                if (catalog.books && Array.isArray(catalog.books)) {
                    for (const book of catalog.books) {
                        // For demo purposes, we'll just monitor books
                        // In production, you'd add real ISBNs/ASINs
                        await censorshipTracker.addBookToMonitoring(
                            book.id,
                            brand,
                            {
                                isbn: book.isbn || null,
                                amazon_asin: book.asin || null
                            }
                        );
                        booksAdded++;
                    }
                }
            } catch (error) {
                console.error(`Error processing brand ${brand}:`, error.message);
            }
        }

        console.log(`✅ Added ${booksAdded} books to censorship monitoring`);

        // Step 3: Get monitoring stats
        console.log('\nStep 3: Checking monitoring status...');

        const stats = await db.get(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
                AVG(priority) as avg_priority
            FROM monitored_books
        `);

        console.log(`\n📊 Monitoring Status:`);
        console.log(`   - Total books: ${stats.total}`);
        console.log(`   - Active monitors: ${stats.active}`);
        console.log(`   - Average priority: ${stats.avg_priority?.toFixed(1) || 0}`);

        // Step 4: Information
        console.log('\n\n✨ Censorship Tracker initialized successfully!\n');
        console.log('📝 Next Steps:');
        console.log('   1. Start monitoring (continuous):');
        console.log('      POST /api/censorship/admin/start-monitoring');
        console.log('\n   2. Or trigger one-time check:');
        console.log('      POST /api/censorship/admin/check-now');
        console.log('\n   3. View recent bans:');
        console.log('      GET /api/censorship/recent-bans');
        console.log('\n   4. View statistics:');
        console.log('      GET /api/censorship/stats');
        console.log('\n   5. Open the dashboard:');
        console.log('      http://localhost:3001/examples/censorship-dashboard.html');
        console.log('\n💡 Tip: In production, add real ISBNs and ASINs to monitored_books');
        console.log('   to enable actual platform tracking.');
        console.log('\n⚠️  Note: Web scraping requires Puppeteer. First run:');
        console.log('   npm install puppeteer\n');

    } catch (error) {
        console.error('\n❌ Error initializing Censorship Tracker:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run initialization
initializeCensorshipTracker()
    .then(() => {
        console.log('✅ Initialization complete\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
