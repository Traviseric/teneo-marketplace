#!/usr/bin/env node

/**
 * Setup Manual Book Enhancement System
 * Smart backup for Amazon API/scraping failures
 * 
 * Usage: node setup-manual-enhancement.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

async function setupManualEnhancement() {
    console.log('🚀 Setting up Manual Book Enhancement System...\n');
    
    try {
        // Path to the marketplace database
        const dbPath = path.join(__dirname, 'marketplace', 'backend', 'database', 'marketplace.db');
        
        // Ensure database exists
        if (!fs.existsSync(dbPath)) {
            console.error('❌ Database not found at:', dbPath);
            console.log('💡 Please run the main marketplace setup first');
            process.exit(1);
        }
        
        // Open database connection
        const db = new Database(dbPath);
        
        // Read and execute schema
        const schemaPath = path.join(__dirname, 'marketplace', 'backend', 'database', 'manual-enhancement-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema commands
        const commands = schema.split(';').filter(cmd => cmd.trim());
        
        console.log('📊 Creating manual enhancement tables...');
        
        for (const command of commands) {
            if (command.trim()) {
                try {
                    db.exec(command + ';');
                } catch (error) {
                    if (!error.message.includes('already exists')) {
                        console.error('Error executing command:', command.substring(0, 50) + '...');
                        console.error(error.message);
                    }
                }
            }
        }
        
        // Verify setup
        const tables = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE '%enhancement%'
        `).all();
        
        console.log('✅ Manual enhancement tables created:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });
        
        // Check sample data
        const sampleData = db.prepare(`
            SELECT asin, actual_title, bestseller_rank 
            FROM manual_book_enhancements
        `).all();
        
        if (sampleData.length > 0) {
            console.log('\n📚 Sample enhanced books:');
            sampleData.forEach(book => {
                console.log(`   - ${book.actual_title} (${book.asin}) - BSR: #${book.bestseller_rank || 'N/A'}`);
            });
        }
        
        // Test the enhancement API endpoint structure
        console.log('\n🔧 Enhancement API endpoints ready:');
        console.log('   - POST /api/manual-enhancement/book    (Add/update book data)');
        console.log('   - GET  /api/manual-enhancement/book/:asin  (Get enhanced data)');
        console.log('   - GET  /api/manual-enhancement/books   (List all enhanced books)');
        console.log('   - POST /api/manual-enhancement/batch   (Batch update multiple books)');
        
        console.log('\n✅ Manual Book Enhancement System setup complete!');
        console.log('\n💡 Usage examples:');
        console.log('   - Add Travis\'s book data manually when Amazon API fails');
        console.log('   - Use search results as fallback data source');
        console.log('   - Batch import book performance data');
        console.log('   - Maintain accurate marketplace data without API dependency');
        
        db.close();
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    setupManualEnhancement();
}

module.exports = setupManualEnhancement;