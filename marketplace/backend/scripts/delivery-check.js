#!/usr/bin/env node
/**
 * Delivery checklist — verify a generated store meets delivery standards.
 *
 * Usage:
 *   node marketplace/backend/scripts/delivery-check.js <store_slug> [base_url]
 *
 *   store_slug   The slug of the store (e.g. "earthy-candle-co-abc12345")
 *   base_url     Base URL to check against. Defaults to http://localhost:3001
 *
 * Checks:
 *   1. Working URL        — GET /store/<slug> returns HTTP 200 with non-empty body
 *   2. Checkout button    — Page has a link/button pointing to checkout or buy-now
 *   3. Email capture form — Page has <input type="email"> or email form
 *   4. Mobile viewport    — Page has <meta name="viewport"> tag
 *   5. No oversized widths — No inline fixed widths >768px
 *   6. Title tag          — <title> tag present and non-empty
 *   7. Meta description   — <meta name="description"> tag present
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = one or more checks failed
 *
 * Can also be used as a module:
 *   const { runChecks } = require('./delivery-check');
 *   const result = await runChecks(html);  // pass HTML directly (skips HTTP fetch)
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ── HTTP fetch helper ─────────────────────────────────────────────────────────

function fetchPage(urlStr) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const mod = parsed.protocol === 'https:' ? https : http;

    const req = mod.get(urlStr, { timeout: 10000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

// ── Individual checks ─────────────────────────────────────────────────────────

function checks(html) {
  return [
    {
      name: 'Title tag present',
      pass: /<title>[^<\s][^<]*<\/title>/i.test(html),
      detail: 'Missing or empty <title> tag — required for SEO and social sharing',
    },
    {
      name: 'Meta description present',
      pass: /<meta[^>]+name=["']description["'][^>]*content=["'][^"']+["']/i.test(html) ||
            /<meta[^>]+content=["'][^"']+["'][^>]*name=["']description["']/i.test(html),
      detail: 'Missing <meta name="description"> — needed for SEO',
    },
    {
      name: 'Mobile viewport meta tag',
      pass: /name=["']viewport["']/i.test(html),
      detail: 'Missing <meta name="viewport"> — page will not be mobile-friendly',
    },
    {
      name: 'No oversized inline widths (>768px)',
      pass: !/width\s*:\s*([89]\d\d|[1-9]\d{3,})px/.test(html),
      detail: 'Found inline CSS width wider than 768px — may break mobile layout',
    },
    {
      name: 'Checkout button or link present',
      pass: /checkout|buy.?now|purchase|add.?to.?cart|shop.?now/i.test(html),
      detail: 'No checkout call-to-action found — store may not convert visitors',
    },
    {
      name: 'Email capture form present',
      pass: /<input[^>]*type=["']email["']/i.test(html),
      detail: 'No email input found — store cannot capture leads',
    },
    {
      name: 'Open Graph image tag',
      pass: /property=["']og:image["']/i.test(html) ||
            /name=["']og:image["']/i.test(html),
      detail: 'Missing og:image meta tag — social share previews will be blank',
    },
  ];
}

// ── Run all checks on an HTML string ─────────────────────────────────────────

function runChecks(html) {
  const results = checks(html).map(check => ({
    name: check.name,
    passed: check.pass,
    detail: check.pass ? null : check.detail,
  }));
  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}

// ── Print report ──────────────────────────────────────────────────────────────

function printReport(slug, statusCode, { allPassed, results }) {
  console.log('');
  console.log('====================================');
  console.log(`  Delivery Check: /store/${slug}`);
  console.log('====================================');
  console.log(`  HTTP Status: ${statusCode}`);
  console.log('');

  for (const r of results) {
    const mark = r.passed ? '✓' : '✗';
    console.log(`  ${mark} ${r.name}`);
    if (r.detail) {
      console.log(`      → ${r.detail}`);
    }
  }

  console.log('');
  const passCount = results.filter(r => r.passed).length;
  const total = results.length;

  if (allPassed) {
    console.log(`  RESULT: PASS (${passCount}/${total} checks passed)`);
  } else {
    console.log(`  RESULT: FAIL (${passCount}/${total} checks passed)`);
  }
  console.log('====================================');
  console.log('');
}

// ── CLI entry point ───────────────────────────────────────────────────────────

async function main() {
  const slug = process.argv[2];
  const baseUrl = (process.argv[3] || 'http://localhost:3001').replace(/\/$/, '');

  if (!slug) {
    console.error('Usage: node delivery-check.js <store_slug> [base_url]');
    console.error('');
    console.error('  store_slug   Slug of the store to check (e.g. my-store-abc12345)');
    console.error('  base_url     Base URL (default: http://localhost:3001)');
    process.exit(1);
  }

  const storeUrl = `${baseUrl}/store/${slug}`;
  console.log(`Fetching ${storeUrl}...`);

  let statusCode;
  let html;

  // HTTP 200 check
  try {
    const { status, body } = await fetchPage(storeUrl);
    statusCode = status;
    html = body;
  } catch (err) {
    console.error(`\n  ✗ Working URL — Could not reach ${storeUrl}: ${err.message}`);
    console.error('  RESULT: FAIL (network error)');
    process.exit(1);
  }

  if (statusCode !== 200) {
    console.error(`\n  ✗ Working URL — Got HTTP ${statusCode} (expected 200)`);
    printReport(slug, statusCode, { allPassed: false, results: [{ name: 'Working URL (HTTP 200)', passed: false, detail: `Got HTTP ${statusCode}` }] });
    process.exit(1);
  }

  if (!html || html.trim().length < 100) {
    console.error('\n  ✗ Working URL — Response body is empty or too short');
    process.exit(1);
  }

  // Run content checks
  const report = runChecks(html);
  printReport(slug, statusCode, report);

  process.exit(report.allPassed ? 0 : 1);
}

// Allow requiring as module for programmatic use
if (require.main === module) {
  main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}

module.exports = { runChecks };
