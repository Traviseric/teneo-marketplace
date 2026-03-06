/**
 * test-store-builder.js
 *
 * Validates the AI Store Builder pipeline against 3 canonical business briefs.
 * When ANTHROPIC_API_KEY is set, calls the live AI service.
 * When it is not set, uses fixture configs to validate the renderer only.
 *
 * Usage: node scripts/test-store-builder.js
 * npm script: npm run test:store-builder
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { renderStorePage } = require('../services/storeRendererService');

const CANONICAL_BRIEFS = [
  {
    name: 'Soy candle store',
    brief: 'I sell handmade soy candles with an earthy, botanical aesthetic. My bestseller is a cedar and lavender candle for $28. I ship nationwide and do custom scents.',
    fixture: {
      name: 'Cedar & Lavender Candle Co.',
      tagline: 'Handmade soy candles with an earthy, botanical soul.',
      palette: { primary: '#7c6b4e', accent: '#4a7c59', bg: '#faf7f2' },
      fonts: { heading: 'Merriweather', body: 'Inter' },
      commerce: {
        fulfillment_type: 'physical',
        payment_provider: 'stripe',
        products: [
          { name: 'Cedar & Lavender Soy Candle', price: 28, description: 'Earthy, botanical scent. Burns 60+ hours.', type: 'physical' }
        ],
        email_capture: true
      }
    },
    expect: { hasProducts: true, productCount: 1 }
  },
  {
    name: 'Online finance course',
    brief: "I teach personal finance to millennials. My main course is 'Money Freedom' — 8 modules, $197. I also have a free email mini-course as a lead magnet.",
    fixture: {
      name: 'Money Freedom Academy',
      tagline: 'Master your money, live on your terms.',
      palette: { primary: '#1d4ed8', accent: '#7c3aed', bg: '#ffffff' },
      fonts: { heading: 'Inter', body: 'Inter' },
      commerce: {
        fulfillment_type: 'digital',
        payment_provider: 'stripe',
        products: [
          { name: 'Money Freedom Course', price: 197, description: '8-module personal finance course for millennials.', type: 'course' }
        ],
        email_capture: true
      },
      modules: { courses: true }
    },
    expect: { hasProducts: true, productCount: 1 }
  },
  {
    name: 'Freelance logo design service',
    brief: "I'm a freelance logo designer. My main service is a full brand identity package for $500 — logo, colors, fonts, business card. Turnaround is 7 days.",
    fixture: {
      name: 'Brand by Design',
      tagline: 'Full brand identity — delivered in 7 days.',
      palette: { primary: '#111827', accent: '#f59e0b', bg: '#ffffff' },
      fonts: { heading: 'Montserrat', body: 'Inter' },
      commerce: {
        fulfillment_type: 'service',
        payment_provider: 'stripe',
        products: [
          { name: 'Brand Identity Package', price: 500, description: 'Logo, colors, fonts, business card. 7-day turnaround.', type: 'service' }
        ],
        email_capture: false
      }
    },
    expect: { hasProducts: true, productCount: 1 }
  }
];

/**
 * Validate rendered HTML against basic structural requirements.
 */
function validateHtml(html, config, testName) {
  const errors = [];

  if (!html.startsWith('<!DOCTYPE html>')) errors.push('Missing <!DOCTYPE html>');
  if (!html.includes('<head>')) errors.push('Missing <head>');
  if (!html.includes('<body>')) errors.push('Missing <body>');

  if (!html.includes(config.name)) errors.push(`Store name "${config.name}" not found in HTML`);
  if (config.tagline && !html.includes(config.tagline)) errors.push(`Tagline "${config.tagline}" not found in HTML`);

  // Check CSS variables injected
  if (!html.includes('--brand-primary')) errors.push('CSS variable --brand-primary not found');

  // Check no unfilled {{VARIABLE}} placeholders remain
  const unfilled = html.match(/\{\{[A-Z_]+\}\}/g);
  if (unfilled) errors.push(`Unfilled placeholders: ${unfilled.join(', ')}`);

  // Check products section exists if expected
  const products = (config.commerce && config.commerce.products) || [];
  if (products.length > 0 && !html.includes('id="products"')) {
    errors.push('Products section (#products) not found in HTML');
  }

  return errors;
}

/**
 * Run a single test: either call the live AI API or use the fixture config.
 */
async function runTest(test, useAI) {
  let config;

  if (useAI) {
    const { buildStoreFromBrief } = require('../services/aiStoreBuilderService');
    config = await buildStoreFromBrief(test.brief);
    if (!config || typeof config !== 'object') throw new Error('buildStoreFromBrief returned non-object');
    if (!config.name) throw new Error('Generated config missing required field: name');
    if (!config.commerce) throw new Error('Generated config missing required field: commerce');
  } else {
    config = test.fixture;
  }

  const html = renderStorePage(config);
  const errors = validateHtml(html, config, test.name);

  return { pass: errors.length === 0, errors, config };
}

async function main() {
  const useAI = !!process.env.ANTHROPIC_API_KEY;
  console.log(`\nAI Store Builder Test Suite`);
  console.log(`Mode: ${useAI ? 'LIVE (ANTHROPIC_API_KEY set)' : 'FIXTURE (no API key — renderer-only)'}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of CANONICAL_BRIEFS) {
    try {
      const result = await runTest(test, useAI);
      if (result.pass) {
        passed++;
        console.log(`  PASS: ${test.name}`);
      } else {
        failed++;
        console.error(`  FAIL: ${test.name}`);
        result.errors.forEach(e => console.error(`        - ${e}`));
      }
    } catch (err) {
      failed++;
      console.error(`  ERROR: ${test.name} — ${err.message}`);
    }
  }

  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
