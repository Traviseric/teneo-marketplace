#!/usr/bin/env node
/**
 * Operator build runner — processes a managed store build end-to-end.
 *
 * Usage:
 *   node marketplace/backend/scripts/run-store-build.js <build_id>
 *
 * Stages:  intake → planning → building → qa → delivered
 *          (any stage can transition to → failed on error)
 *
 * Prerequisites:
 *   - ANTHROPIC_API_KEY must be set in .env (planning stage calls Claude)
 *   - Database must be initialized (node marketplace/backend/database/init.js)
 *
 * Exit codes:
 *   0 = delivered successfully
 *   1 = failed (see log output)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { randomUUID } = require('crypto');
const storeBuildService = require('../services/storeBuildService');
const { buildStoreFromBrief } = require('../services/aiStoreBuilderService');
const { renderStorePage } = require('../services/storeRendererService');
const db = require('../database/database');

// ── Helpers ──────────────────────────────────────────────────────────────────

function stamp() {
  return new Date().toISOString();
}

function log(stage, msg) {
  console.log(`[${stamp()}] [${stage.toUpperCase().padEnd(8)}] ${msg}`);
}

function generateSlug(name) {
  return (name || 'store')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── QA checks (static HTML analysis) ─────────────────────────────────────────

function runStaticChecks(html) {
  const checks = [
    {
      name: 'Non-empty HTML body',
      pass: html.length > 500,
    },
    {
      name: 'Valid DOCTYPE',
      pass: /<!doctype\s+html/i.test(html),
    },
    {
      name: 'Has <title> tag',
      pass: /<title>[^<]+<\/title>/i.test(html),
    },
    {
      name: 'Has viewport meta tag',
      pass: /name=["']viewport["']/i.test(html),
    },
    {
      name: 'Has checkout button or link',
      pass: /checkout|buy.?now|purchase|add.?to.?cart/i.test(html),
    },
    {
      name: 'Has email capture input',
      pass: /<input[^>]*type=["']email["']/i.test(html),
    },
    {
      name: 'No fixed pixel widths >768px in inline styles',
      pass: !/width\s*:\s*([89]\d\d|[1-9]\d{3,})px/.test(html),
    },
  ];

  let allPassed = true;
  for (const check of checks) {
    const mark = check.pass ? '✓' : '✗';
    log('qa', `  ${mark} ${check.name}`);
    if (!check.pass) allPassed = false;
  }
  return allPassed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const buildId = process.argv[2];

  if (!buildId) {
    console.error('Usage: node run-store-build.js <build_id>');
    console.error('');
    console.error('  build_id   The ID from the store_builds table (from intake form or API)');
    process.exit(1);
  }

  // ── INTAKE: read build record ─────────────────────────────────────────────
  log('intake', `Loading build ${buildId}...`);
  const build = await storeBuildService.getBuild(buildId);

  if (!build) {
    console.error(`Build not found: ${buildId}`);
    process.exit(1);
  }
  if (build.status !== 'intake') {
    console.error(
      `Build is in status '${build.status}', expected 'intake'. ` +
      `Re-run is only supported for intake-stage builds.`
    );
    process.exit(1);
  }

  const brief = build.intake_payload && build.intake_payload.business_brief;
  const contactEmail = build.intake_payload && build.intake_payload.contact_email;
  const tier = build.tier || 'builder';

  if (!brief) {
    console.error('Build has no business_brief in intake_payload. Cannot proceed.');
    await storeBuildService.updateStatus(buildId, 'failed', 'Missing business_brief');
    process.exit(1);
  }

  log('intake', `Tier: ${tier}`);
  log('intake', `Contact: ${contactEmail || '(none)'}`);
  log('intake', `Brief: "${brief.substring(0, 100).replace(/\n/g, ' ')}${brief.length > 100 ? '...' : ''}"`);

  // ── PLANNING: call AI to generate config ──────────────────────────────────
  try {
    await storeBuildService.updateStatus(buildId, 'planning', 'AI planning phase started');
    log('planning', 'Calling AI Store Builder to generate store config...');

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. ' +
        'Add it to marketplace/backend/.env to enable AI planning.'
      );
    }

    const config = await buildStoreFromBrief(brief);
    const storeName = config.name || config.brand && config.brand.name || 'Unnamed Store';
    log('planning', `Config generated: "${storeName}"`);

    // ── BUILDING: render HTML from config ───────────────────────────────────
    await storeBuildService.updateStatus(buildId, 'building', 'Rendering HTML from config');
    log('building', 'Rendering store HTML...');

    const html = renderStorePage(config);
    log('building', `HTML rendered: ${(html.length / 1024).toFixed(1)} KB`);

    // Persist to stores table
    const storeId = randomUUID();
    const slugBase = generateSlug(storeName);
    const slug = `${slugBase}-${storeId.slice(0, 8)}`;

    await db.run(
      'INSERT INTO stores (id, user_id, slug, config, html, status) VALUES (?, ?, ?, ?, ?, ?)',
      [storeId, null, slug, JSON.stringify(config), html, 'published']
    );

    const products = (config.commerce && config.commerce.products) || [];
    for (const product of products) {
      await db.run(
        'INSERT INTO store_products (id, store_id, name, price, description, type) VALUES (?, ?, ?, ?, ?, ?)',
        [
          randomUUID(),
          storeId,
          product.name,
          product.price,
          product.description || '',
          product.type || 'digital',
        ]
      );
    }

    // Link store_id back to build record
    await db.run(
      "UPDATE store_builds SET store_id = ?, updated_at = datetime('now') WHERE id = ?",
      [storeId, buildId]
    );

    log('building', `Store saved: /store/${slug} (${products.length} product${products.length !== 1 ? 's' : ''})`);

    // ── QA: static HTML checks ───────────────────────────────────────────────
    await storeBuildService.updateStatus(buildId, 'qa', 'Running QA delivery checks');
    log('qa', 'Running static delivery checks...');

    const allPassed = runStaticChecks(html);

    if (!allPassed) {
      const msg = 'One or more QA checks failed — see operator log above';
      log('qa', msg);
      await storeBuildService.updateStatus(buildId, 'failed', msg);
      console.error('\nBuild FAILED at QA stage. Fix the renderer and re-run.\n');
      process.exit(1);
    }

    log('qa', 'All checks passed.');

    // ── DELIVERED ────────────────────────────────────────────────────────────
    const storeUrl = `/store/${slug}`;
    await storeBuildService.updateStatus(buildId, 'delivered', `Store URL: ${storeUrl}`);
    log('delivered', `Build complete!`);

    console.log('\n========================================');
    console.log('  BUILD COMPLETE');
    console.log('========================================');
    console.log(`  Build ID   : ${buildId}`);
    console.log(`  Store ID   : ${storeId}`);
    console.log(`  Store URL  : ${storeUrl}`);
    console.log(`  Products   : ${products.length}`);
    console.log(`  Tier       : ${tier}`);
    if (contactEmail) {
      console.log(`  Client     : ${contactEmail}`);
    }
    console.log('========================================\n');

  } catch (err) {
    log('error', `Build failed: ${err.message}`);
    try {
      await storeBuildService.updateStatus(buildId, 'failed', err.message.substring(0, 500));
    } catch (updateErr) {
      log('error', `Could not update status to failed: ${updateErr.message}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected fatal error:', err);
  process.exit(1);
});
