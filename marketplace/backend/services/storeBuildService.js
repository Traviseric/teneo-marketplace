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

  const deliveredAt = newStatus === 'delivered' ? "datetime('now')" : 'NULL';
  await db.run(
    `UPDATE store_builds
     SET status = ?, operator_notes = COALESCE(?, operator_notes), updated_at = datetime('now'),
         delivered_at = ${newStatus === 'delivered' ? "datetime('now')" : 'delivered_at'}
     WHERE id = ?`,
    [newStatus, notes || null, buildId]
  );
}

async function getBuild(buildId) {
  const build = await db.get('SELECT * FROM store_builds WHERE id = ?', [buildId]);
  if (!build) return null;
  try {
    build.intake_payload = typeof build.intake_payload === 'string'
      ? JSON.parse(build.intake_payload)
      : build.intake_payload;
  } catch (_) { /* leave as string if unparseable */ }
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
    try {
      b.intake_payload = typeof b.intake_payload === 'string'
        ? JSON.parse(b.intake_payload)
        : b.intake_payload;
    } catch (_) { /* leave as string */ }
    return b;
  });
}

module.exports = { createBuild, updateStatus, getBuild, listBuilds, VALID_STATUSES };
