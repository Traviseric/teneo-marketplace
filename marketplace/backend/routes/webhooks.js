/**
 * Webhook Routes for Orchestrator Integration
 *
 * Enables real-time communication from orchestrator to marketplace:
 * - Brand created → Auto-deploy to marketplace
 * - Book generated → Auto-add to catalog
 * - SEO content → Auto-publish blog posts
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { safeMessage } = require('../utils/validate');

// Helper: Generate brand ID from name
function generateBrandId(brandName) {
  return brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Helper: Ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

/**
 * Webhook: Brand Created
 *
 * Triggered when orchestrator creates a new brand
 * Creates complete brand directory structure in marketplace
 */
router.post('/orchestrator/brand-created', async (req, res) => {
  console.log('📦 Webhook received: brand-created');

  try {
    const brandData = req.body;

    // Validate required fields
    if (!brandData.name) {
      return res.status(400).json({
        error: 'Missing required field: name'
      });
    }

    // Generate brand ID if not provided
    const brandId = brandData.id || generateBrandId(brandData.name);

    console.log(`  Brand: ${brandData.name}`);
    console.log(`  ID: ${brandId}`);

    // Define directory structure
    const brandDir = path.join(__dirname, '../../frontend/brands', brandId);
    const coversDir = path.join(brandDir, 'covers');
    const booksDir = path.join(brandDir, 'books');
    const blogDir = path.join(brandDir, 'blog');

    // Create directories
    await ensureDir(brandDir);
    await ensureDir(coversDir);
    await ensureDir(booksDir);
    await ensureDir(blogDir);

    // Create config.json
    const config = {
      id: brandId,
      name: brandData.name,
      tagline: brandData.tagline || brandData.HERO_SUBHEADLINE || '',
      themeColor: brandData.themeColor || brandData.PRIMARY_COLOR || '#2563EB',
      accentColor: brandData.accentColor || brandData.ACCENT_COLOR || '#F59E0B',
      features: brandData.features || {
        newsletter: true,
        reviews: true,
        socialSharing: true
      },
      created: new Date().toISOString(),
      source: 'orchestrator'
    };

    await fs.writeFile(
      path.join(brandDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create empty catalog.json
    const catalog = {
      books: [],
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(brandDir, 'catalog.json'),
      JSON.stringify(catalog, null, 2)
    );

    // Create variables.json
    const variables = {
      HERO_HEADLINE: brandData.HERO_HEADLINE || `Welcome to ${brandData.name}`,
      HERO_SUBHEADLINE: brandData.HERO_SUBHEADLINE || brandData.tagline || '',
      BUTTON_TEXT: brandData.BUTTON_TEXT || 'Browse Books',
      FOOTER_TEXT: `© ${new Date().getFullYear()} ${brandData.name}. All rights reserved.`
    };

    await fs.writeFile(
      path.join(brandDir, 'variables.json'),
      JSON.stringify(variables, null, 2)
    );

    console.log(`✅ Brand created successfully`);
    console.log(`  Directory: ${brandDir}`);
    console.log(`  URL: /store.html?brand=${brandId}`);

    // Return success
    res.json({
      success: true,
      brandId: brandId,
      url: `/store.html?brand=${brandId}`,
      directories: {
        brand: brandDir,
        covers: coversDir,
        books: booksDir,
        blog: blogDir
      }
    });

  } catch (error) {
    console.error('❌ Webhook error (brand-created):', error);
    res.status(500).json({
      error: safeMessage(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Webhook: Book Generated
 *
 * Triggered when orchestrator generates a new book
 * Adds book to brand's catalog and saves files
 */
router.post('/orchestrator/book-generated', async (req, res) => {
  console.log('📚 Webhook received: book-generated');

  try {
    const { brandId, book, coverFile, pdfFile } = req.body;

    // Validate
    if (!brandId || !book) {
      return res.status(400).json({
        error: 'Missing required fields: brandId, book'
      });
    }

    console.log(`  Brand: ${brandId}`);
    console.log(`  Book: ${book.title}`);

    // Read current catalog
    const brandDir = path.join(__dirname, '../../frontend/brands', brandId);
    const catalogPath = path.join(brandDir, 'catalog.json');

    let catalog;
    try {
      const catalogData = await fs.readFile(catalogPath, 'utf-8');
      catalog = JSON.parse(catalogData);
    } catch (error) {
      // Catalog doesn't exist, create it
      catalog = { books: [], lastUpdated: new Date().toISOString() };
    }

    // Generate book ID if not provided
    const bookId = book.id || generateBrandId(book.title);

    // Create book entry
    const bookEntry = {
      id: bookId,
      title: book.title,
      author: book.author || 'AI Generated',
      price: book.price || 14.99,
      salePrice: book.salePrice,
      description: book.description || '',
      longDescription: book.longDescription || book.description || '',
      cover: `/brands/${brandId}/covers/${bookId}.jpg`,
      pdf: `/brands/${brandId}/books/${bookId}.pdf`,
      categories: book.categories || [],
      tags: book.tags || [],
      wordCount: book.wordCount || 0,
      chapters: book.chapters || [],
      features: book.features || [],
      reviews: {
        average: 0,
        count: 0
      },
      created: new Date().toISOString()
    };

    // Add to catalog
    catalog.books.push(bookEntry);
    catalog.lastUpdated = new Date().toISOString();

    // Write updated catalog
    await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));

    // Save cover file if provided (base64 encoded)
    if (coverFile) {
      const coverPath = path.join(brandDir, 'covers', `${bookId}.jpg`);
      const buffer = Buffer.from(coverFile, 'base64');
      await fs.writeFile(coverPath, buffer);
      console.log(`  Cover saved: ${coverPath}`);
    }

    // Save PDF file if provided (base64 encoded)
    if (pdfFile) {
      const pdfPath = path.join(brandDir, 'books', `${bookId}.pdf`);
      const buffer = Buffer.from(pdfFile, 'base64');
      await fs.writeFile(pdfPath, buffer);
      console.log(`  PDF saved: ${pdfPath}`);
    }

    console.log(`✅ Book added successfully`);
    console.log(`  Total books in catalog: ${catalog.books.length}`);

    res.json({
      success: true,
      bookId: bookId,
      brandUrl: `/store.html?brand=${brandId}`,
      catalogSize: catalog.books.length
    });

  } catch (error) {
    console.error('❌ Webhook error (book-generated):', error);
    res.status(500).json({
      error: safeMessage(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Webhook: SEO Content Generated
 *
 * Triggered when orchestrator generates SEO blog post
 * Publishes to brand's blog directory
 */
router.post('/orchestrator/seo-generated', async (req, res) => {
  console.log('📝 Webhook received: seo-generated');

  try {
    const { brandId, post } = req.body;

    // Validate
    if (!brandId || !post) {
      return res.status(400).json({
        error: 'Missing required fields: brandId, post'
      });
    }

    console.log(`  Brand: ${brandId}`);
    console.log(`  Post: ${post.title}`);

    // Ensure blog directory exists
    const blogDir = path.join(__dirname, '../../frontend/brands', brandId, 'blog');
    await ensureDir(blogDir);

    // Generate slug if not provided
    const slug = post.slug || generateBrandId(post.title);

    // Create HTML file
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title}</title>
  <meta name="description" content="${post.metaDescription || post.title}">
  <meta name="keywords" content="${post.keywords || ''}">
  <link rel="stylesheet" href="/styles/blog.css">
</head>
<body>
  <article class="blog-post">
    <header>
      <h1>${post.title}</h1>
      <div class="meta">
        <time datetime="${new Date().toISOString()}">${new Date().toLocaleDateString()}</time>
      </div>
    </header>

    <div class="content">
      ${post.content || post.html || ''}
    </div>

    ${post.relatedBook ? `
    <aside class="related-book">
      <h3>Want to Learn More?</h3>
      <p>This topic is covered in detail in our book:</p>
      <a href="/store.html?brand=${brandId}" class="cta-button">
        Browse Our Books →
      </a>
    </aside>
    ` : ''}
  </article>
</body>
</html>`;

    // Write post file
    const postPath = path.join(blogDir, `${slug}.html`);
    await fs.writeFile(postPath, html);

    // Update blog index
    const indexPath = path.join(blogDir, 'index.json');
    let index;
    try {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(indexData);
    } catch (error) {
      index = { posts: [] };
    }

    index.posts.unshift({
      slug,
      title: post.title,
      description: post.metaDescription || '',
      date: new Date().toISOString(),
      url: `/brands/${brandId}/blog/${slug}.html`
    });

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    console.log(`✅ Blog post published`);
    console.log(`  URL: /brands/${brandId}/blog/${slug}.html`);

    res.json({
      success: true,
      postUrl: `/brands/${brandId}/blog/${slug}.html`,
      slug: slug
    });

  } catch (error) {
    console.error('❌ Webhook error (seo-generated):', error);
    res.status(500).json({
      error: safeMessage(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    webhooks: [
      '/webhooks/orchestrator/brand-created',
      '/webhooks/orchestrator/book-generated',
      '/webhooks/orchestrator/seo-generated'
    ]
  });
});

module.exports = router;
