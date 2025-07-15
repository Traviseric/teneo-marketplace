#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

class ShowcaseGenerator {
    constructor() {
        this.basePath = path.join(__dirname, '..');
        this.frontendPath = path.join(this.basePath, 'marketplace', 'frontend');
        this.brandsPath = path.join(this.frontendPath, 'brands');
    }

    async loadBrandData() {
        const brands = {};
        
        try {
            const brandDirs = await fs.readdir(this.brandsPath);
            
            for (const brandDir of brandDirs) {
                const brandPath = path.join(this.brandsPath, brandDir);
                const stat = await fs.stat(brandPath);
                
                if (stat.isDirectory()) {
                    try {
                        // Load brand config
                        const configPath = path.join(brandPath, 'config.json');
                        const catalogPath = path.join(brandPath, 'catalog.json');
                        
                        let config = {};
                        let catalog = {};
                        
                        try {
                            const configContent = await fs.readFile(configPath, 'utf8');
                            config = JSON.parse(configContent);
                        } catch (e) {
                            // Config file doesn't exist or is invalid
                        }
                        
                        try {
                            const catalogContent = await fs.readFile(catalogPath, 'utf8');
                            catalog = JSON.parse(catalogContent);
                        } catch (e) {
                            // Catalog file doesn't exist or is invalid
                        }
                        
                        brands[brandDir] = {
                            id: brandDir,
                            config,
                            catalog,
                            bookCount: catalog.books ? catalog.books.length : 0,
                            collections: catalog.collections ? catalog.collections.length : 0
                        };
                        
                    } catch (error) {
                        console.log(colorize(`⚠️  Error loading brand ${brandDir}: ${error.message}`, 'yellow'));
                    }
                }
            }
        } catch (error) {
            console.log(colorize(`❌ Error reading brands directory: ${error.message}`, 'red'));
        }
        
        return brands;
    }

    async loadNetworkStats() {
        try {
            const registryPath = path.join(this.frontendPath, 'network-registry.json');
            const registryContent = await fs.readFile(registryPath, 'utf8');
            const registry = JSON.parse(registryContent);
            
            return {
                totalStores: registry.stores ? registry.stores.length : 0,
                totalBooks: registry.networkStats ? registry.networkStats.totalBooks : 0,
                activeStores: registry.stores ? registry.stores.filter(s => s.status === 'active').length : 0,
                connections: registry.connections ? registry.connections.length : 0
            };
        } catch (error) {
            return {
                totalStores: 1,
                totalBooks: 0,
                activeStores: 1,
                connections: 0
            };
        }
    }

    generateBrandCard(brandId, brandData) {
        const brand = brandData.catalog;
        const config = brandData.config;
        
        const primaryColor = config.theme?.primaryColor || '#58A6FF';
        const brandName = brand.name || brandId;
        const brandDescription = brand.description || 'A collection of books';
        const bookCount = brandData.bookCount;
        
        return `
        <div class="brand-showcase-card" style="border-color: ${primaryColor};">
            <div class="brand-header" style="background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}aa);">
                <div class="brand-logo">${config.logo || '📚'}</div>
                <h3 class="brand-name">${brandName}</h3>
                <p class="brand-tagline">${config.tagline || brandDescription}</p>
            </div>
            <div class="brand-stats">
                <div class="stat">
                    <span class="stat-number">${bookCount}</span>
                    <span class="stat-label">Books</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${brandData.collections}</span>
                    <span class="stat-label">Collections</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${brand.books ? brand.books.filter(b => b.featured).length : 0}</span>
                    <span class="stat-label">Featured</span>
                </div>
            </div>
            <div class="brand-books-preview">
                ${brand.books ? brand.books.slice(0, 3).map(book => `
                    <div class="book-preview">
                        <div class="book-cover">${book.cover || '📖'}</div>
                        <div class="book-info">
                            <div class="book-title">${book.title}</div>
                            <div class="book-price">$${book.price}</div>
                        </div>
                    </div>
                `).join('') : ''}
            </div>
            <div class="brand-actions">
                <a href="/?brand=${brandId}" class="brand-visit-btn" style="background: ${primaryColor};">
                    Visit Store
                </a>
            </div>
        </div>`;
    }

    generateShowcaseHTML(brands, networkStats) {
        const brandCards = Object.entries(brands)
            .filter(([_, data]) => data.bookCount > 0)
            .map(([id, data]) => this.generateBrandCard(id, data))
            .join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teneo Network Showcase - Federated Bookstores</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .showcase-hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 4rem 0;
            text-align: center;
            margin-bottom: 4rem;
        }

        .showcase-hero h1 {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }

        .showcase-hero p {
            font-size: 1.3rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
        }

        .network-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
            margin: 3rem 0;
        }

        .network-stat-card {
            background: var(--bg-secondary);
            border-radius: 15px;
            padding: 2rem;
            text-align: center;
            border: 1px solid var(--border-color);
            transition: transform 0.3s ease;
        }

        .network-stat-card:hover {
            transform: translateY(-5px);
        }

        .network-stat-number {
            font-size: 3rem;
            font-weight: 700;
            color: var(--accent-color);
            margin-bottom: 0.5rem;
            display: block;
        }

        .network-stat-label {
            color: var(--text-secondary);
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .brands-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin: 3rem 0;
        }

        .brand-showcase-card {
            background: var(--bg-secondary);
            border-radius: 15px;
            overflow: hidden;
            border: 2px solid var(--border-color);
            transition: all 0.3s ease;
        }

        .brand-showcase-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.1);
        }

        .brand-header {
            padding: 2rem;
            text-align: center;
            color: white;
        }

        .brand-logo {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .brand-name {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .brand-tagline {
            opacity: 0.9;
            font-size: 1rem;
        }

        .brand-stats {
            display: flex;
            justify-content: space-around;
            padding: 1.5rem;
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
        }

        .stat {
            text-align: center;
        }

        .stat-number {
            display: block;
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--accent-color);
        }

        .stat-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .brand-books-preview {
            padding: 1.5rem;
        }

        .book-preview {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--border-color);
        }

        .book-preview:last-child {
            border-bottom: none;
        }

        .book-cover {
            font-size: 1.5rem;
            width: 2rem;
            text-align: center;
        }

        .book-title {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9rem;
        }

        .book-price {
            color: var(--accent-color);
            font-weight: 600;
            margin-left: auto;
        }

        .brand-actions {
            padding: 1.5rem;
            text-align: center;
        }

        .brand-visit-btn {
            display: inline-block;
            padding: 1rem 2rem;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .brand-visit-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .showcase-features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin: 4rem 0;
        }

        .feature-card {
            background: var(--bg-secondary);
            border-radius: 15px;
            padding: 2rem;
            text-align: center;
            border: 1px solid var(--border-color);
        }

        .feature-icon {
            font-size: 3rem;
            color: var(--accent-color);
            margin-bottom: 1rem;
        }

        .feature-title {
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: var(--text-primary);
        }

        .feature-description {
            color: var(--text-secondary);
            line-height: 1.6;
        }

        .cta-section {
            background: linear-gradient(135deg, var(--accent-color), #764ba2);
            color: white;
            padding: 4rem 0;
            text-align: center;
            border-radius: 20px;
            margin: 4rem 0;
        }

        .cta-section h2 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .cta-section p {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 2rem;
        }

        .cta-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }

        .cta-btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: rgba(255,255,255,0.2);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            border: 2px solid rgba(255,255,255,0.3);
            transition: all 0.3s ease;
        }

        .cta-btn:hover {
            background: white;
            color: var(--accent-color);
        }

        .cta-btn.primary {
            background: white;
            color: var(--accent-color);
        }

        .cta-btn.primary:hover {
            background: rgba(255,255,255,0.9);
        }

        @media (max-width: 768px) {
            .showcase-hero h1 {
                font-size: 2.5rem;
            }
            
            .brands-grid {
                grid-template-columns: 1fr;
            }
            
            .cta-buttons {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <h1 class="logo">🌐 Teneo Network</h1>
            <nav class="nav">
                <a href="/" class="nav-link">Home</a>
                <a href="/network.html" class="nav-link">Network Search</a>
                <a href="/showcase.html" class="nav-link active">Showcase</a>
            </nav>
        </div>
    </header>

    <main class="main">
        <!-- Hero Section -->
        <section class="showcase-hero">
            <div class="container">
                <h1>🌟 The Teneo Network</h1>
                <p>Discover independent bookstores in our federated network. Each store maintains its unique identity while benefiting from shared discovery.</p>
            </div>
        </section>

        <div class="container">
            <!-- Network Statistics -->
            <section class="network-stats">
                <div class="network-stat-card">
                    <span class="network-stat-number">${networkStats.totalStores}</span>
                    <span class="network-stat-label">Independent Stores</span>
                </div>
                <div class="network-stat-card">
                    <span class="network-stat-number">${networkStats.totalBooks}</span>
                    <span class="network-stat-label">Unique Books</span>
                </div>
                <div class="network-stat-card">
                    <span class="network-stat-number">${networkStats.activeStores}</span>
                    <span class="network-stat-label">Active Now</span>
                </div>
                <div class="network-stat-card">
                    <span class="network-stat-number">${networkStats.connections}</span>
                    <span class="network-stat-label">Network Connections</span>
                </div>
            </section>

            <!-- Brands Showcase -->
            <section>
                <h2 style="text-align: center; margin-bottom: 3rem; font-size: 2.5rem;">Our Network Stores</h2>
                <div class="brands-grid">
                    ${brandCards}
                </div>
            </section>

            <!-- Network Features -->
            <section class="showcase-features">
                <div class="feature-card">
                    <div class="feature-icon">🔍</div>
                    <h3 class="feature-title">Cross-Store Discovery</h3>
                    <p class="feature-description">Search across all network stores simultaneously. Readers discover books they wouldn't find otherwise.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🤝</div>
                    <h3 class="feature-title">Shared Recommendations</h3>
                    <p class="feature-description">Books recommend related content from other stores, creating natural cross-pollination.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🚫</div>
                    <h3 class="feature-title">Uncensorable</h3>
                    <p class="feature-description">No central authority can remove stores or books. Each store maintains complete autonomy.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💰</div>
                    <h3 class="feature-title">Keep 100% Revenue</h3>
                    <p class="feature-description">No marketplace fees. Direct creator-to-reader transactions with minimal payment processing.</p>
                </div>
            </section>

            <!-- Call to Action -->
            <section class="cta-section">
                <div class="container">
                    <h2>Join the Network Today</h2>
                    <p>Start your own bookstore or connect your existing store to the Teneo Network</p>
                    <div class="cta-buttons">
                        <a href="/launch.html" class="cta-btn primary">
                            <i class="fas fa-rocket"></i>
                            Start Your Store
                        </a>
                        <a href="/network.html" class="cta-btn">
                            <i class="fas fa-search"></i>
                            Explore Books
                        </a>
                        <a href="https://github.com/TravisEric/teneo-marketplace" class="cta-btn">
                            <i class="fab fa-github"></i>
                            View Source Code
                        </a>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-info">
                    <p>&copy; 2024 Teneo Network. Building the future of independent publishing.</p>
                    <p>Open source, federated, and uncensorable.</p>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Add some interactive features
        document.addEventListener('DOMContentLoaded', function() {
            // Animate counters
            const counters = document.querySelectorAll('.network-stat-number');
            counters.forEach(counter => {
                const target = parseInt(counter.textContent);
                let current = 0;
                const increment = target / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    counter.textContent = Math.floor(current);
                }, 30);
            });

            // Add hover effects to brand cards
            const brandCards = document.querySelectorAll('.brand-showcase-card');
            brandCards.forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-10px) scale(1.02)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });
        });
    </script>
</body>
</html>`;
    }

    async generateShowcase() {
        console.log(colorize('\n🌟 Generating Store Showcase', 'bold'));
        console.log(colorize('============================\n', 'blue'));

        // Load brand data
        console.log(colorize('📚 Loading brand data...', 'yellow'));
        const brands = await this.loadBrandData();
        
        const brandCount = Object.keys(brands).length;
        const totalBooks = Object.values(brands).reduce((sum, brand) => sum + brand.bookCount, 0);
        
        console.log(colorize(`Found ${brandCount} brands with ${totalBooks} total books`, 'green'));

        // Load network statistics
        console.log(colorize('📊 Loading network statistics...', 'yellow'));
        const networkStats = await this.loadNetworkStats();

        // Update stats with current data
        networkStats.totalBooks = Math.max(networkStats.totalBooks, totalBooks);

        console.log(colorize('✅ Data loaded successfully', 'green'));

        // Generate HTML
        console.log(colorize('🎨 Generating showcase HTML...', 'yellow'));
        const showcaseHTML = this.generateShowcaseHTML(brands, networkStats);

        // Save to file
        const outputPath = path.join(this.frontendPath, 'showcase.html');
        await fs.writeFile(outputPath, showcaseHTML);

        console.log(colorize('\n🎉 Showcase generated successfully!', 'green'));
        console.log(colorize('File saved to:', 'blue'), outputPath);
        console.log(colorize('View at:', 'blue'), 'http://localhost:3001/showcase.html');

        // Generate summary
        console.log(colorize('\n📋 Showcase Summary:', 'bold'));
        console.log(colorize('Brands featured:', 'blue'), Object.keys(brands).filter(id => brands[id].bookCount > 0).length);
        console.log(colorize('Total books:', 'blue'), totalBooks);
        console.log(colorize('Network stores:', 'blue'), networkStats.totalStores);
        console.log(colorize('Active connections:', 'blue'), networkStats.connections);

        return {
            brands,
            networkStats,
            outputPath
        };
    }
}

// CLI Interface
async function main() {
    const generator = new ShowcaseGenerator();
    
    try {
        await generator.generateShowcase();
    } catch (error) {
        console.error(colorize(`\n❌ Error: ${error.message}`, 'red'));
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ShowcaseGenerator;