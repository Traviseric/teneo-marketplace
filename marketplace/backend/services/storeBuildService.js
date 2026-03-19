const db = require('../database/database');
const { randomUUID } = require('crypto');

const VALID_STATUSES = ['intake', 'paid', 'planning', 'building', 'qa', 'delivered', 'failed'];

// Valid forward transitions (any status can also transition to 'failed')
const ALLOWED_TRANSITIONS = {
  intake: ['paid', 'planning', 'failed'],
  paid: ['planning', 'failed'],
  planning: ['building', 'failed'],
  building: ['qa', 'failed'],
  qa: ['delivered', 'failed'],
  delivered: [],
  failed: [],
};

function isValidTransition(from, to) {
  if (to === 'failed') return true; // any → failed always allowed
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function countComponents(config) {
  if (!config || typeof config !== 'object') return 0;
  const sections = config.sections || config.components || config.modules || [];
  return Array.isArray(sections) ? sections.length : 0;
}

/**
 * Run a QA checklist against a store config before marking it delivered.
 * Returns a plain object with boolean results and a timestamp.
 */
async function runQaChecklist(storeSlug, config) {
  return {
    has_checkout: !!(config?.commerce?.payment_provider),
    has_products: (config?.commerce?.products?.length || 0) > 0,
    has_delivery_url: !!storeSlug,
    has_email_capture: !!(config?.modules?.email_capture),
    config_valid: !!(config?.name && config?.tagline && config?.commerce),
    checked_at: new Date().toISOString(),
  };
}

/**
 * Persist delivery artifacts when a build reaches 'delivered' status.
 * Updates rendered_config, delivery_url, qa_results, artifact_summary, and status atomically.
 */
async function recordDeliveryArtifacts(buildId, { config, deliveryUrl, qaResults }) {
  const artifactSummary = {
    component_count: countComponents(config),
    product_count: config?.commerce?.products?.length || 0,
    renderer_version: '1.0',
    captured_at: new Date().toISOString(),
  };

  await db.run(
    `UPDATE store_builds SET
       rendered_config = ?,
       delivery_url = ?,
       qa_results = ?,
       artifact_summary = ?,
       status = 'delivered',
       updated_at = datetime('now'),
       delivered_at = datetime('now')
     WHERE id = ?`,
    [
      JSON.stringify(config),
      deliveryUrl,
      JSON.stringify(qaResults),
      JSON.stringify(artifactSummary),
      buildId,
    ]
  );
}

async function createBuild(intakePayload, tier) {
  const id = randomUUID().replace(/-/g, '');
  await db.run(
    `INSERT INTO store_builds (id, intake_payload, status, tier)
     VALUES (?, ?, 'intake', ?)`,
    [id, JSON.stringify(intakePayload), tier || null]
  );
  return id;
}

async function updateStatus(buildId, newStatus, notes) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const build = await getBuild(buildId);
  if (!build) throw new Error('Build not found');

  if (!isValidTransition(build.status, newStatus)) {
    throw new Error(`Invalid status transition: ${build.status} → ${newStatus}`);
  }

  await db.run(
    `UPDATE store_builds
     SET status = ?, operator_notes = COALESCE(?, operator_notes), updated_at = datetime('now'),
         delivered_at = ${newStatus === 'delivered' ? "datetime('now')" : 'delivered_at'}
     WHERE id = ?`,
    [newStatus, notes || null, buildId]
  );
}

function parseJsonField(value) {
  if (!value || typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch (_) { return value; }
}

async function getBuild(buildId) {
  const build = await db.get('SELECT * FROM store_builds WHERE id = ?', [buildId]);
  if (!build) return null;
  build.intake_payload = parseJsonField(build.intake_payload);
  build.rendered_config = parseJsonField(build.rendered_config);
  build.qa_results = parseJsonField(build.qa_results);
  build.artifact_summary = parseJsonField(build.artifact_summary);
  return build;
}

async function listBuilds(filters = {}) {
  let query = 'SELECT * FROM store_builds';
  const params = [];

  if (filters.status) {
    query += ' WHERE status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const builds = await db.all(query, params);
  return builds.map(b => {
    b.intake_payload = parseJsonField(b.intake_payload);
    b.rendered_config = parseJsonField(b.rendered_config);
    b.qa_results = parseJsonField(b.qa_results);
    b.artifact_summary = parseJsonField(b.artifact_summary);
    return b;
  });
}

module.exports = {
  createBuild,
  updateStatus,
  getBuild,
  listBuilds,
  runQaChecklist,
  recordDeliveryArtifacts,
  VALID_STATUSES,
};
