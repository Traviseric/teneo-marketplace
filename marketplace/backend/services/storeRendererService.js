/**
 * Store Renderer Service
 *
 * Converts a store_config JSON (produced by aiStoreBuilderService) into a complete HTML page
 * using the component library in marketplace/frontend/components-library/.
 *
 * Usage:
 *   const { renderStorePage } = require('./storeRendererService');
 *   const html = renderStorePage(storeConfig);
 *
 * Works without ANTHROPIC_API_KEY — pure template rendering, no AI calls.
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../../frontend/components-library');

/**
 * Load a component HTML file. Returns empty string if the file is a stub or missing.
 */
function loadComponent(relPath) {
  const fullPath = path.join(COMPONENTS_DIR, relPath);
  if (!fs.existsSync(fullPath)) return '';
  const content = fs.readFileSync(fullPath, 'utf8').trim();
  // Stub components are just a comment line (e.g. "<!-- Book Card (individual) -->")
  if (content.length < 100) return '';
  return content;
}

/**
 * Fill {{VAR}} and {{VAR|default}} placeholders in a template string.
 */
function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (_, key, defaultVal) => {
    const val = vars[key];
    if (val !== undefined && val !== null && val !== '') return String(val);
    return defaultVal !== undefined ? defaultVal : '';
  });
}

/**
 * Generate inline CSS custom properties from store config palette/fonts.
 */
function buildCssVars(config) {
  const p = config.palette || {};
  const f = config.fonts || {};
  return `
    --brand-primary: ${p.primary || '#2563eb'};
    --brand-accent: ${p.accent || '#7c3aed'};
    --brand-bg: ${p.bg || '#ffffff'};
    --brand-text: #111827;
    --brand-text-secondary: #4B5563;
    --brand-text-tertiary: #6B7280;
    --brand-text-light: #ffffff;
    --heading-font: '${f.heading || 'Inter'}', sans-serif;
    --body-font: '${f.body || 'Inter'}', sans-serif;
  `.trim();
}

/**
 * Build a Google Fonts URL for the requested fonts.
 */
function buildFontsUrl(config) {
  const f = config.fonts || {};
  const heading = f.heading || 'Inter';
  const body = f.body || 'Inter';
  const families = [...new Set([heading, body])].map(n => n.replace(/ /g, '+')).join('&family=');
  return `https://fonts.googleapis.com/css2?family=${families}:wght@400;600;700;800&display=swap`;
}

/**
 * Render hero section using hero-dream-outcome.html component.
 * Maps store_config fields to the component's variables.
 */
function renderHero(config) {
  const tpl = loadComponent('heroes/hero-dream-outcome.html');
  const commerce = config.commerce || {};
  const fulfillType = commerce.fulfillment_type || 'digital';

  const actionVerbMap = { digital: 'Discover', service: 'Book', pod: 'Order', physical: 'Shop' };
  const mechanismMap = {
    digital: 'Instant digital delivery',
    service: 'Expert service',
    pod: 'Print on demand',
    physical: 'Ships nationwide',
  };

  const vars = {
    ACTION_VERB: actionVerbMap[fulfillType] || 'Explore',
    OUTCOME: config.name || 'Your Store',
    TIME_FRAME: config.tagline || '',
    MECHANISM_PREFIX: '—',
    MECHANISM: mechanismMap[fulfillType] || 'Quality guaranteed',
    CTA_TEXT: 'Shop Now',
  };

  if (tpl) return fillTemplate(tpl, vars);

  // Inline fallback if component is not loadable
  return `
<section style="background:var(--brand-bg);padding:5rem 2rem;text-align:center;">
  <div style="max-width:800px;margin:0 auto;">
    <h1 style="font-family:var(--heading-font);font-size:3rem;font-weight:800;color:var(--brand-text);margin-bottom:1rem;">
      <span style="color:var(--brand-accent)">${vars.ACTION_VERB}</span> ${vars.OUTCOME}
    </h1>
    <p style="font-size:1.25rem;color:var(--brand-text-secondary);margin-bottom:2rem;">${vars.TIME_FRAME}</p>
    <a href="#products" style="display:inline-block;padding:1rem 2.5rem;background:var(--brand-primary);color:#fff;border-radius:0.75rem;font-size:1.125rem;font-weight:700;text-decoration:none;">${vars.CTA_TEXT}</a>
  </div>
</section>`;
}

/**
 * Render a product card for a single product.
 */
function renderProductCard(product, config) {
  const p = config.palette || {};
  const primary = p.primary || '#2563eb';
  const accent = p.accent || '#7c3aed';
  const typeLabel = { ebook: 'Digital', course: 'Course', service: 'Service', physical: 'Physical' }[product.type] || 'Product';
  const price = typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : product.price;

  return `
  <div style="background:#fff;border-radius:1rem;padding:1.5rem;box-shadow:0 4px 20px rgba(0,0,0,0.08);display:flex;flex-direction:column;gap:0.75rem;border:1px solid #f3f4f6;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:0.75rem;font-weight:600;color:${accent};background:${accent}15;padding:0.25rem 0.75rem;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">${typeLabel}</span>
      <span style="font-size:1.5rem;font-weight:800;color:${primary};">${price}</span>
    </div>
    <h3 style="font-family:var(--heading-font);font-size:1.25rem;font-weight:700;color:var(--brand-text);margin:0;">${product.name}</h3>
    ${product.description ? `<p style="font-size:0.9rem;color:var(--brand-text-secondary);line-height:1.6;margin:0;">${product.description}</p>` : ''}
    <a href="#checkout" style="margin-top:0.5rem;display:block;text-align:center;padding:0.75rem 1.5rem;background:${primary};color:#fff;border-radius:0.5rem;font-weight:600;text-decoration:none;font-size:0.95rem;">Add to Cart</a>
  </div>`;
}

/**
 * Render the products section.
 */
function renderProductsSection(config) {
  const products = (config.commerce && config.commerce.products) || [];
  if (products.length === 0) return '';

  const cards = products.map(p => renderProductCard(p, config)).join('\n');
  const columns = products.length === 1 ? '1fr' : products.length === 2 ? '1fr 1fr' : 'repeat(auto-fit,minmax(280px,1fr))';

  return `
<section id="products" style="padding:4rem 2rem;background:#f9fafb;">
  <div style="max-width:1100px;margin:0 auto;">
    <h2 style="font-family:var(--heading-font);font-size:2rem;font-weight:800;color:var(--brand-text);text-align:center;margin-bottom:0.75rem;">Our Products</h2>
    <p style="text-align:center;color:var(--brand-text-secondary);margin-bottom:2.5rem;">${config.tagline || ''}</p>
    <div style="display:grid;grid-template-columns:${columns};gap:1.5rem;">
      ${cards}
    </div>
  </div>
</section>`;
}

/**
 * Render the CTA / email capture section.
 * Uses cta-section-full.html if available, falls back to inline.
 */
function renderCTASection(config) {
  const ctaTpl = loadComponent('ctas/cta-section-full.html');
  const p = config.palette || {};
  const primary = p.primary || '#2563eb';

  if (ctaTpl) {
    return fillTemplate(ctaTpl, {
      HEADLINE: `Ready to explore ${config.name}?`,
      SUBHEADLINE: config.tagline || '',
      CTA_TEXT: 'Get Started',
      CTA_LINK: '#checkout',
    });
  }

  return `
<section style="padding:5rem 2rem;background:${primary};text-align:center;">
  <div style="max-width:700px;margin:0 auto;">
    <h2 style="font-family:var(--heading-font);font-size:2.25rem;font-weight:800;color:#fff;margin-bottom:1rem;">Ready to explore ${config.name}?</h2>
    <p style="font-size:1.125rem;color:rgba(255,255,255,0.85);margin-bottom:2rem;">${config.tagline || ''}</p>
    <a href="#products" style="display:inline-block;padding:1rem 2.5rem;background:#fff;color:${primary};border-radius:0.75rem;font-size:1.125rem;font-weight:700;text-decoration:none;">Shop Now</a>
  </div>
</section>`;
}

/**
 * Render benefits grid using the config or generate generic content.
 */
function renderBenefitsSection(config) {
  const benefitsTpl = loadComponent('content/benefits-grid.html');
  const commerce = config.commerce || {};
  const fulfillType = commerce.fulfillment_type || 'digital';

  const defaultBenefits = {
    digital: [
      { icon: '⚡', title: 'Instant Delivery', desc: 'Download immediately after purchase' },
      { icon: '🔒', title: 'Secure Checkout', desc: 'Your payment is always protected' },
      { icon: '♾️', title: 'Lifetime Access', desc: 'Keep your purchase forever' },
    ],
    service: [
      { icon: '🎯', title: 'Expert Quality', desc: 'Delivered by verified professionals' },
      { icon: '⏱️', title: 'Fast Turnaround', desc: 'Quick delivery on every project' },
      { icon: '💬', title: 'Direct Communication', desc: 'Work directly with the creator' },
    ],
    physical: [
      { icon: '📦', title: 'Careful Packaging', desc: 'Every order packed with care' },
      { icon: '🚀', title: 'Fast Shipping', desc: 'Ships within 1-3 business days' },
      { icon: '↩️', title: 'Easy Returns', desc: '30-day hassle-free returns' },
    ],
    pod: [
      { icon: '🖨️', title: 'Print on Demand', desc: 'Produced fresh for every order' },
      { icon: '🎨', title: 'Premium Quality', desc: 'Professional-grade materials' },
      { icon: '🌍', title: 'Ships Worldwide', desc: 'Delivered anywhere on Earth' },
    ],
  };

  const benefits = defaultBenefits[fulfillType] || defaultBenefits.digital;

  if (benefitsTpl) {
    const vars = {};
    benefits.forEach((b, i) => {
      vars[`BENEFIT_${i + 1}_ICON`] = b.icon;
      vars[`BENEFIT_${i + 1}_TITLE`] = b.title;
      vars[`BENEFIT_${i + 1}_DESC`] = b.desc;
    });
    return fillTemplate(benefitsTpl, vars);
  }

  const cards = benefits.map(b => `
    <div style="text-align:center;padding:1.5rem;">
      <div style="font-size:2rem;margin-bottom:0.75rem;">${b.icon}</div>
      <h3 style="font-family:var(--heading-font);font-size:1.1rem;font-weight:700;color:var(--brand-text);margin-bottom:0.5rem;">${b.title}</h3>
      <p style="font-size:0.9rem;color:var(--brand-text-secondary);line-height:1.6;">${b.desc}</p>
    </div>`).join('');

  return `
<section style="padding:4rem 2rem;background:#fff;">
  <div style="max-width:900px;margin:0 auto;">
    <h2 style="font-family:var(--heading-font);font-size:1.875rem;font-weight:800;color:var(--brand-text);text-align:center;margin-bottom:2.5rem;">Why Choose Us</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;">
      ${cards}
    </div>
  </div>
</section>`;
}

/**
 * Render the footer.
 */
function renderFooter(config) {
  return `
<footer style="background:#111827;color:#9ca3af;padding:2.5rem 2rem;text-align:center;">
  <p style="font-family:var(--heading-font);font-size:1rem;font-weight:700;color:#fff;margin-bottom:0.5rem;">${config.name || 'Store'}</p>
  <p style="font-size:0.875rem;margin:0;">${config.tagline || ''}</p>
  <p style="font-size:0.75rem;margin-top:1.5rem;color:#6b7280;">&copy; ${new Date().getFullYear()} ${config.name || 'Store'}. All rights reserved.</p>
</footer>`;
}

/**
 * Assemble a full HTML document from the rendered sections.
 */
function assembleHTML({ head, body, cssVars, fontsUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${head.title}</title>
  <meta name="description" content="${head.description}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontsUrl}" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--body-font);
      background: var(--brand-bg);
      color: var(--brand-text);
      :root { ${cssVars} }
    }
    :root { ${cssVars} }
    a { color: inherit; }
  </style>
</head>
<body>
  <nav style="position:sticky;top:0;z-index:100;background:var(--brand-bg);border-bottom:1px solid #e5e7eb;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;">
    <span style="font-family:var(--heading-font);font-size:1.25rem;font-weight:800;color:var(--brand-primary)">${head.title}</span>
    <a href="#products" style="padding:0.5rem 1.25rem;background:var(--brand-primary);color:#fff;border-radius:0.5rem;font-weight:600;text-decoration:none;font-size:0.875rem;">Shop Now</a>
  </nav>
  ${body}
</body>
</html>`;
}

/**
 * Main render function: converts a store_config into a complete HTML page.
 *
 * @param {object} storeConfig - The store configuration object from aiStoreBuilderService
 * @returns {string} Full HTML page string
 */
function renderStorePage(storeConfig) {
  if (!storeConfig || typeof storeConfig !== 'object') {
    throw new Error('storeConfig must be a non-null object');
  }
  if (!storeConfig.name) {
    throw new Error('storeConfig.name is required');
  }

  const cssVars = buildCssVars(storeConfig);
  const fontsUrl = buildFontsUrl(storeConfig);

  const hero = renderHero(storeConfig);
  const benefits = renderBenefitsSection(storeConfig);
  const products = renderProductsSection(storeConfig);
  const cta = renderCTASection(storeConfig);
  const footer = renderFooter(storeConfig);

  const body = [hero, benefits, products, cta, footer].filter(Boolean).join('\n');

  return assembleHTML({
    head: {
      title: storeConfig.name,
      description: storeConfig.tagline || storeConfig.name,
    },
    body,
    cssVars,
    fontsUrl,
  });
}

module.exports = { renderStorePage, fillTemplate, loadComponent };
