/**
 * AI Page Builder Service
 * Natural language → Production-ready pages using component library
 *
 * Usage:
 * const builder = new AIPageBuilder();
 * const result = await builder.generatePage({
 *   prompt: "Sales page for book 'IRS Secrets', $27, professional blue theme, with upsell",
 *   brand: "irs_secrets"
 * });
 */

const fs = require('fs');
const path = require('path');

class AIPageBuilder {
  constructor(db) {
    this.db = db;
    this.componentsPath = path.join(__dirname, '../../frontend/components-library');
    this.manifest = require('../../frontend/components-library/COMPONENT_MANIFEST.json');
  }

  /**
   * Main entry point: Natural language → Full page
   *
   * @param {Object} options
   * @param {string} options.prompt - Natural language description
   * @param {string} options.brand - Brand name
   * @param {Object} options.data - Product data (title, price, etc.)
   * @returns {Object} Generated page info
   */
  async generatePage({ prompt, brand = 'teneo', data = {} }) {
    console.log(`🤖 AI Page Builder: "${prompt}"`);

    // 1. Parse intent from natural language
    const intent = this.parseIntent(prompt, data);
    console.log('📋 Intent:', intent);

    // 2. Select best components based on intent
    const components = this.selectComponents(intent);
    console.log('🧩 Selected components:', components);

    // 3. Load component HTML/CSS/JS
    const loadedComponents = await this.loadComponents(components);

    // 4. Populate variables with product data
    const populated = this.populateVariables(loadedComponents, data);

    // 5. Apply brand theme
    const branded = this.applyBrand(populated, brand);

    // 6. Assemble full page
    const html = this.assemblePage(branded, intent);

    // 7. Save to filesystem
    const route = this.generateRoute(data.title || 'page');
    const filePath = await this.savePage(html, route);

    console.log(`✅ Page generated: ${route}`);

    return {
      success: true,
      route,
      filePath,
      components: Object.keys(components),
      preview: `http://localhost:3001${route}`
    };
  }

  /**
   * Parse natural language into structured intent
   */
  parseIntent(prompt, data) {
    const intent = {
      pageType: 'sales-page',
      style: 'professional',
      features: [],
      tone: 'authoritative',
      urgency: false,
      socialProof: true
    };

    const lower = prompt.toLowerCase();

    // Detect page type
    if (lower.includes('landing page') || lower.includes('sales page')) {
      intent.pageType = 'sales-page';
    } else if (lower.includes('checkout')) {
      intent.pageType = 'checkout';
    } else if (lower.includes('upsell') || lower.includes('oto')) {
      intent.pageType = 'upsell';
    } else if (lower.includes('thank you')) {
      intent.pageType = 'thank-you';
    }

    // Detect style/vibe
    if (lower.match(/professional|law firm|corporate|formal/)) {
      intent.style = 'professional';
      intent.tone = 'authoritative';
    } else if (lower.match(/modern|startup|tech|energetic/)) {
      intent.style = 'modern';
      intent.tone = 'casual';
    } else if (lower.match(/luxury|premium|high-end|elegant/)) {
      intent.style = 'luxury';
      intent.tone = 'sophisticated';
    } else if (lower.match(/friendly|casual|approachable/)) {
      intent.style = 'friendly';
      intent.tone = 'casual';
    }

    // Detect features
    if (lower.includes('email capture') || lower.includes('lead capture')) {
      intent.features.push('email-capture');
    }
    if (lower.includes('upsell') || lower.includes('order bump')) {
      intent.features.push('upsell');
    }
    if (lower.includes('countdown') || lower.includes('timer')) {
      intent.features.push('countdown');
      intent.urgency = true;
    }
    if (lower.includes('review') || lower.includes('testimonial')) {
      intent.features.push('reviews');
      intent.socialProof = true;
    }
    if (lower.includes('video') || lower.includes('vsl')) {
      intent.features.push('video');
    }

    // Detect product type
    if (lower.includes('book') || data.type === 'book') {
      intent.productType = 'book';
    } else if (lower.includes('course')) {
      intent.productType = 'course';
    } else if (lower.includes('service')) {
      intent.productType = 'service';
    }

    return intent;
  }

  /**
   * Select best components based on intent
   */
  selectComponents(intent) {
    const selected = {};

    // Select hero based on style and product type
    if (intent.productType === 'book') {
      if (intent.style === 'professional') {
        selected.hero = 'heroes/hero-book-focused';
      } else if (intent.style === 'modern') {
        selected.hero = 'heroes/hero-revolutionary';
      } else {
        selected.hero = 'heroes/hero-vsl';
      }
    }

    // Add features
    if (intent.features.includes('email-capture')) {
      selected.emailCapture = 'forms/form-email-capture';
    }

    if (intent.features.includes('countdown')) {
      selected.countdown = 'interactive/countdown-timer';
    }

    if (intent.features.includes('reviews')) {
      selected.reviews = 'social-proof/testimonial-grid';
    }

    if (intent.features.includes('video')) {
      selected.video = 'interactive/video-player';
    }

    // Always add CTA
    selected.cta = 'ctas/cta-button-primary';

    // Page-specific components
    if (intent.pageType === 'sales-page') {
      selected.pricing = 'pricing/pricing-table-three-tier';
    } else if (intent.pageType === 'upsell') {
      selected.upsell = 'conversion/order-bump';
    }

    return selected;
  }

  /**
   * Load component files from disk
   */
  async loadComponents(components) {
    const loaded = {};

    for (const [key, componentPath] of Object.entries(components)) {
      const fullPath = path.join(this.componentsPath, `${componentPath}.html`);

      try {
        const html = fs.readFileSync(fullPath, 'utf8');
        loaded[key] = {
          path: componentPath,
          html
        };
      } catch (error) {
        console.warn(`⚠️  Component not found: ${componentPath} (using placeholder)`);
        loaded[key] = {
          path: componentPath,
          html: `<!-- ${componentPath} component placeholder -->`
        };
      }
    }

    return loaded;
  }

  /**
   * Replace {{VARIABLES}} with actual data
   */
  populateVariables(components, data) {
    const populated = {};

    const variables = {
      BOOK_TITLE: data.title || 'Your Book Title',
      BOOK_SUBTITLE: data.subtitle || '',
      AUTHOR: data.author || 'Author Name',
      PRICE: data.price || '27',
      ORIGINAL_PRICE: data.originalPrice || '',
      BOOK_COVER_URL: data.coverUrl || '/images/book-cover-placeholder.jpg',
      DESCRIPTION: data.description || 'Book description goes here...',
      UPSELL_TITLE: data.upsellTitle || '',
      UPSELL_PRICE: data.upsellPrice || '',
      CTA_TEXT: data.ctaText || 'Get Your Copy Now',
      GUARANTEE_TEXT: data.guarantee || '30-Day Money-Back Guarantee',
      BASE_URL: process.env.BASE_URL || 'http://localhost:3001'
    };

    for (const [key, component] of Object.entries(components)) {
      let html = component.html;

      // Replace all variables
      for (const [varName, varValue] of Object.entries(variables)) {
        const regex = new RegExp(`{{${varName}}}`, 'g');
        html = html.replace(regex, varValue);
      }

      populated[key] = {
        ...component,
        html
      };
    }

    return populated;
  }

  /**
   * Apply brand theme (CSS variables)
   */
  applyBrand(components, brandName) {
    const branded = {};

    // Brand theme CSS link
    const brandCSS = `<link rel="stylesheet" href="/components-library/brand-themes/${brandName}-brand.css">`;

    // Base CSS
    const baseCSS = `
      <link rel="stylesheet" href="/components-library/_base/variables.css">
      <link rel="stylesheet" href="/components-library/_base/reset.css">
    `;

    for (const [key, component] of Object.entries(components)) {
      let html = component.html;

      // If component has a <head>, inject CSS there
      if (html.includes('<head>')) {
        html = html.replace('</head>', `${baseCSS}\n${brandCSS}\n</head>`);
      }

      branded[key] = {
        ...component,
        html,
        brandApplied: brandName
      };
    }

    return branded;
  }

  /**
   * Assemble components into full page
   */
  assemblePage(components, intent) {
    const componentOrder = ['hero', 'video', 'emailCapture', 'pricing', 'reviews', 'countdown', 'cta', 'upsell'];

    let bodyHTML = '';

    // Assemble components in order
    for (const key of componentOrder) {
      if (components[key]) {
        bodyHTML += `\n<!-- ${key} component -->\n${components[key].html}\n`;
      }
    }

    // Full page template
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${intent.pageType} - Teneo Marketplace</title>

    <!-- Base CSS -->
    <link rel="stylesheet" href="/components-library/_base/variables.css">
    <link rel="stylesheet" href="/components-library/_base/reset.css">

    <!-- Brand Theme -->
    ${components.hero ? `<link rel="stylesheet" href="/components-library/brand-themes/${components.hero.brandApplied}-brand.css">` : ''}

    <!-- Page Styles -->
    <style>
        body {
            font-family: var(--font-body);
            color: var(--brand-text);
            background: var(--brand-bg);
        }
    </style>
</head>
<body>
    ${bodyHTML}

    <!-- Analytics -->
    <script>
        // Track page view
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'page_view',
                pageUrl: window.location.pathname
            })
        });
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Generate URL route from title
   */
  generateRoute(title) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `/books/${slug}`;
  }

  /**
   * Save page to filesystem
   */
  async savePage(html, route) {
    const filePath = path.join(__dirname, `../../frontend/pages${route}.html`);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, html, 'utf8');

    // Register route in Express (would need to add route dynamically or restart)
    // For now, just return the file path

    return filePath;
  }

  /**
   * Generate multiple pages for complete funnel
   */
  async generateFunnel({ prompt, brand, products }) {
    console.log(`🎯 Generating complete funnel...`);

    const pages = [];

    // 1. Landing page
    const landing = await this.generatePage({
      prompt: `${prompt} - landing page with email capture`,
      brand,
      data: products.main
    });
    pages.push({ type: 'landing', ...landing });

    // 2. Checkout page
    const checkout = await this.generatePage({
      prompt: `${prompt} - checkout page with order bump`,
      brand,
      data: { ...products.main, orderBump: products.orderBump }
    });
    pages.push({ type: 'checkout', ...checkout });

    // 3. Upsell page (if provided)
    if (products.upsell) {
      const upsell = await this.generatePage({
        prompt: `${prompt} - one-time offer upsell page`,
        brand,
        data: products.upsell
      });
      pages.push({ type: 'upsell', ...upsell });
    }

    // 4. Thank you page
    const thankYou = await this.generatePage({
      prompt: `${prompt} - thank you page with download link`,
      brand,
      data: products.main
    });
    pages.push({ type: 'thank-you', ...thankYou });

    console.log(`✅ Funnel complete! Generated ${pages.length} pages.`);

    return {
      success: true,
      pages,
      funnelFlow: pages.map(p => p.route).join(' → ')
    };
  }

  /**
   * Optimize existing page based on analytics
   */
  async optimizePage(pageRoute, conversionRate) {
    console.log(`🔧 Optimizing ${pageRoute} (current conversion: ${conversionRate}%)`);

    // Analyze what's missing
    const suggestions = [];

    if (conversionRate < 3) {
      suggestions.push({
        issue: 'Low conversion - likely trust issue',
        fix: 'Add social proof (reviews, testimonials, badges)',
        components: ['social-proof/testimonial-grid', 'social-proof/trust-badges']
      });

      suggestions.push({
        issue: 'Missing urgency',
        fix: 'Add countdown timer or scarcity indicator',
        components: ['interactive/countdown-timer', 'conversion/scarcity-indicator']
      });
    }

    if (conversionRate >= 3 && conversionRate < 5) {
      suggestions.push({
        issue: 'Good but not great - optimize value proposition',
        fix: 'Emphasize benefits over features, add guarantee',
        components: ['conversion/guarantee-box', 'content/benefits-grid']
      });
    }

    // Generate optimized version
    // (Would implement A/B test here)

    return {
      currentConversion: conversionRate,
      suggestions,
      action: 'Create A/B test with suggested improvements'
    };
  }
}

module.exports = AIPageBuilder;
