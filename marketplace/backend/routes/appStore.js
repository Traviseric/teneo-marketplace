// marketplace/backend/routes/appStore.js
// Agent App Store — registry, discovery, reviews, usage tracking

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'marketplace.db');

function getDb() {
    return new sqlite3.Database(dbPath);
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// ─── Browse / Search apps ───
router.get('/', async (req, res) => {
    const db = getDb();
    try {
        const { category, verification, q, sort, limit = 50, offset = 0 } = req.query;

        let where = ['a.status = ?'];
        let params = ['active'];

        if (category) {
            where.push('a.category = ?');
            params.push(category);
        }
        if (verification) {
            where.push('a.verification_tier = ?');
            params.push(verification);
        }
        if (q) {
            where.push('(a.name LIKE ? OR a.description LIKE ? OR EXISTS (SELECT 1 FROM app_capabilities ac WHERE ac.app_id = a.id AND ac.capability LIKE ?))');
            const term = `%${q}%`;
            params.push(term, term, term);
        }

        let orderBy = 'a.trust_score DESC, a.avg_rating DESC';
        if (sort === 'rating') orderBy = 'a.avg_rating DESC, a.review_count DESC';
        if (sort === 'popular') orderBy = 'a.total_calls DESC';
        if (sort === 'newest') orderBy = 'a.created_at DESC';

        params.push(parseInt(limit), parseInt(offset));

        const apps = await dbAll(db,
            `SELECT a.*,
                (SELECT GROUP_CONCAT(ac.capability, ',') FROM app_capabilities ac WHERE ac.app_id = a.id) as capabilities_list
             FROM apps a
             WHERE ${where.join(' AND ')}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            params
        );

        const countRow = await dbGet(db,
            `SELECT COUNT(*) as total FROM apps a WHERE ${where.join(' AND ')}`,
            params.slice(0, -2)
        );

        res.json({
            success: true,
            apps: apps.map(formatApp),
            total: countRow.total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('App store browse error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch apps' });
    } finally {
        db.close();
    }
});

// ─── Agent discovery endpoint ───
// GET /api/apps/discover?capability=image.generate&min_trust=5
router.get('/discover', async (req, res) => {
    const db = getDb();
    try {
        const { capability, task, min_trust = 0, limit = 10 } = req.query;

        if (!capability && !task) {
            return res.status(400).json({
                success: false,
                error: 'Provide either capability (exact match) or task (semantic search)'
            });
        }

        let apps;

        if (capability) {
            // Exact capability match
            apps = await dbAll(db,
                `SELECT DISTINCT a.*,
                    (SELECT GROUP_CONCAT(ac2.capability, ',') FROM app_capabilities ac2 WHERE ac2.app_id = a.id) as capabilities_list
                 FROM apps a
                 JOIN app_capabilities ac ON ac.app_id = a.id
                 WHERE ac.capability LIKE ? AND a.status = 'active' AND a.trust_score >= ?
                 ORDER BY a.trust_score DESC, a.avg_rating DESC
                 LIMIT ?`,
                [`%${capability}%`, parseFloat(min_trust), parseInt(limit)]
            );
        } else {
            // Task-based search (keyword for now, embeddings later)
            const terms = task.split(/\s+/).filter(t => t.length > 2);
            const likeClauses = terms.map(() => '(a.name LIKE ? OR a.description LIKE ? OR ac.capability LIKE ? OR ac.description LIKE ?)');
            const likeParams = terms.flatMap(t => {
                const term = `%${t}%`;
                return [term, term, term, term];
            });

            apps = await dbAll(db,
                `SELECT DISTINCT a.*,
                    (SELECT GROUP_CONCAT(ac2.capability, ',') FROM app_capabilities ac2 WHERE ac2.app_id = a.id) as capabilities_list
                 FROM apps a
                 JOIN app_capabilities ac ON ac.app_id = a.id
                 WHERE (${likeClauses.join(' OR ')}) AND a.status = 'active' AND a.trust_score >= ?
                 ORDER BY a.trust_score DESC, a.avg_rating DESC
                 LIMIT ?`,
                [...likeParams, parseFloat(min_trust), parseInt(limit)]
            );
        }

        // Include endpoints for each matched app so agents know how to call them
        for (const app of apps) {
            app.endpoints = await dbAll(db,
                'SELECT name, method, path, capability, cost_sats, input_schema, output_schema FROM app_endpoints WHERE app_id = ?',
                [app.id]
            );
            app.endpoints.forEach(ep => {
                if (ep.input_schema) ep.input_schema = JSON.parse(ep.input_schema);
                if (ep.output_schema) ep.output_schema = JSON.parse(ep.output_schema);
            });
        }

        res.json({
            success: true,
            query: capability || task,
            apps: apps.map(formatApp),
            count: apps.length
        });
    } catch (error) {
        console.error('App discovery error:', error);
        res.status(500).json({ success: false, error: 'Discovery failed' });
    } finally {
        db.close();
    }
});

// ─── Get single app detail ───
router.get('/:id', async (req, res) => {
    const db = getDb();
    try {
        const app = await dbGet(db,
            `SELECT a.*,
                (SELECT GROUP_CONCAT(ac.capability, ',') FROM app_capabilities ac WHERE ac.app_id = a.id) as capabilities_list
             FROM apps a WHERE a.id = ?`,
            [req.params.id]
        );

        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        // Get endpoints
        app.endpoints = await dbAll(db,
            'SELECT * FROM app_endpoints WHERE app_id = ?',
            [app.id]
        );
        app.endpoints.forEach(ep => {
            if (ep.input_schema) ep.input_schema = JSON.parse(ep.input_schema);
            if (ep.output_schema) ep.output_schema = JSON.parse(ep.output_schema);
        });

        // Get recent reviews
        app.reviews = await dbAll(db,
            'SELECT * FROM app_reviews WHERE app_id = ? ORDER BY created_at DESC LIMIT 10',
            [app.id]
        );

        // Get usage stats
        const stats = await dbGet(db,
            `SELECT
                COUNT(*) as total_calls,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_calls,
                AVG(response_ms) as avg_response_ms,
                SUM(cost_sats) as total_revenue_sats
             FROM app_calls WHERE app_id = ?`,
            [app.id]
        );
        app.stats = stats;

        res.json({ success: true, app: formatApp(app) });
    } catch (error) {
        console.error('App detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch app' });
    } finally {
        db.close();
    }
});

// ─── Register a new app ───
router.post('/', async (req, res) => {
    const db = getDb();
    try {
        const {
            name, description, category, capabilities,
            endpoint_url, auth_method, pricing_model, pricing_config,
            source_url, icon, publisher_id, endpoints
        } = req.body;

        if (!name || !endpoint_url || !publisher_id) {
            return res.status(400).json({
                success: false,
                error: 'name, endpoint_url, and publisher_id are required'
            });
        }

        const id = `app-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomBytes(4).toString('hex')}`;

        await dbRun(db,
            `INSERT INTO apps (id, publisher_id, name, description, category, capabilities, endpoint_url, auth_method, pricing_model, pricing_config, source_url, icon, verification_tier, trust_score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, publisher_id, name, description || '',
                category || 'general',
                JSON.stringify(capabilities || []),
                endpoint_url,
                auth_method || 'service_key',
                pricing_model || 'free',
                JSON.stringify(pricing_config || {}),
                source_url || null,
                icon || null,
                source_url ? 'community' : 'unverified',
                source_url ? 2 : 0
            ]
        );

        // Insert capabilities for search index
        if (capabilities && capabilities.length > 0) {
            for (const cap of capabilities) {
                const capStr = typeof cap === 'string' ? cap : cap.name;
                const capDesc = typeof cap === 'string' ? null : cap.description;
                await dbRun(db,
                    'INSERT INTO app_capabilities (app_id, capability, description) VALUES (?, ?, ?)',
                    [id, capStr, capDesc]
                );
            }
        }

        // Insert endpoints
        if (endpoints && endpoints.length > 0) {
            for (const ep of endpoints) {
                await dbRun(db,
                    `INSERT INTO app_endpoints (app_id, name, method, path, capability, cost_sats, input_schema, output_schema)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id, ep.name, ep.method || 'POST', ep.path,
                        ep.capability || null, ep.cost_sats || 0,
                        ep.input_schema ? JSON.stringify(ep.input_schema) : null,
                        ep.output_schema ? JSON.stringify(ep.output_schema) : null
                    ]
                );
            }
        }

        res.status(201).json({ success: true, app: { id, name, endpoint_url } });
    } catch (error) {
        console.error('App registration error:', error);
        res.status(500).json({ success: false, error: 'Failed to register app' });
    } finally {
        db.close();
    }
});

// ─── Update an app ───
router.put('/:id', async (req, res) => {
    const db = getDb();
    try {
        const app = await dbGet(db, 'SELECT * FROM apps WHERE id = ?', [req.params.id]);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const { name, description, category, endpoint_url, pricing_model, pricing_config, source_url, icon, status } = req.body;

        await dbRun(db,
            `UPDATE apps SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                endpoint_url = COALESCE(?, endpoint_url),
                pricing_model = COALESCE(?, pricing_model),
                pricing_config = COALESCE(?, pricing_config),
                source_url = COALESCE(?, source_url),
                icon = COALESCE(?, icon),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, description, category, endpoint_url, pricing_model,
             pricing_config ? JSON.stringify(pricing_config) : null,
             source_url, icon, status, req.params.id]
        );

        res.json({ success: true, message: 'App updated' });
    } catch (error) {
        console.error('App update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update app' });
    } finally {
        db.close();
    }
});

// ─── Leave a review ───
router.post('/:id/reviews', async (req, res) => {
    const db = getDb();
    try {
        const { reviewer_id, reviewer_type, rating, comment } = req.body;

        if (!reviewer_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'reviewer_id and rating (1-5) are required'
            });
        }

        const app = await dbGet(db, 'SELECT id FROM apps WHERE id = ?', [req.params.id]);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        await dbRun(db,
            'INSERT INTO app_reviews (app_id, reviewer_id, reviewer_type, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [req.params.id, reviewer_id, reviewer_type || 'human', rating, comment || null]
        );

        // Update app avg rating and review count
        const stats = await dbGet(db,
            'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM app_reviews WHERE app_id = ?',
            [req.params.id]
        );

        await dbRun(db,
            'UPDATE apps SET avg_rating = ?, review_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [Math.round(stats.avg_rating * 100) / 100, stats.review_count, req.params.id]
        );

        res.status(201).json({ success: true, message: 'Review submitted' });
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit review' });
    } finally {
        db.close();
    }
});

// ─── Log an app call (usage tracking) ───
router.post('/:id/calls', async (req, res) => {
    const db = getDb();
    try {
        const { endpoint_name, caller_id, caller_type, capability_used, cost_sats, response_ms, success, error_message } = req.body;

        await dbRun(db,
            `INSERT INTO app_calls (app_id, endpoint_name, caller_id, caller_type, capability_used, cost_sats, response_ms, success, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, endpoint_name, caller_id, caller_type || 'agent',
             capability_used, cost_sats || 0, response_ms, success !== false ? 1 : 0, error_message]
        );

        // Update total calls on the app
        await dbRun(db,
            'UPDATE apps SET total_calls = total_calls + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.params.id]
        );

        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Call log error:', error);
        res.status(500).json({ success: false, error: 'Failed to log call' });
    } finally {
        db.close();
    }
});

// ─── Flag an app ───
router.post('/:id/flag', async (req, res) => {
    const db = getDb();
    try {
        const { reporter_id, incident_type, description } = req.body;

        if (!reporter_id || !incident_type) {
            return res.status(400).json({
                success: false,
                error: 'reporter_id and incident_type are required'
            });
        }

        await dbRun(db,
            'INSERT INTO app_incidents (app_id, reporter_id, incident_type, description) VALUES (?, ?, ?, ?)',
            [req.params.id, reporter_id, incident_type, description || null]
        );

        res.status(201).json({ success: true, message: 'Incident reported' });
    } catch (error) {
        console.error('Flag error:', error);
        res.status(500).json({ success: false, error: 'Failed to report incident' });
    } finally {
        db.close();
    }
});

// ─── Get app stats (for developers) ───
router.get('/:id/stats', async (req, res) => {
    const db = getDb();
    try {
        const app = await dbGet(db, 'SELECT id, name, total_calls, avg_rating, review_count FROM apps WHERE id = ?', [req.params.id]);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const callStats = await dbGet(db,
            `SELECT
                COUNT(*) as total_calls,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
                AVG(response_ms) as avg_response_ms,
                SUM(cost_sats) as total_revenue_sats,
                COUNT(DISTINCT caller_id) as unique_callers
             FROM app_calls WHERE app_id = ?`,
            [req.params.id]
        );

        const callsByDay = await dbAll(db,
            `SELECT DATE(created_at) as day, COUNT(*) as calls, SUM(cost_sats) as revenue_sats
             FROM app_calls WHERE app_id = ? AND created_at >= datetime('now', '-30 days')
             GROUP BY DATE(created_at) ORDER BY day`,
            [req.params.id]
        );

        res.json({
            success: true,
            app: app.name,
            stats: {
                ...callStats,
                avg_response_ms: Math.round(callStats.avg_response_ms || 0),
                success_rate: callStats.total_calls > 0
                    ? Math.round((callStats.successful / callStats.total_calls) * 100) : 100
            },
            daily: callsByDay
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    } finally {
        db.close();
    }
});

// ─── Get app manifest (machine-readable for agents) ───
router.get('/:id/manifest', async (req, res) => {
    const db = getDb();
    try {
        const app = await dbGet(db, 'SELECT * FROM apps WHERE id = ?', [req.params.id]);
        if (!app) {
            return res.status(404).json({ success: false, error: 'App not found' });
        }

        const capabilities = await dbAll(db,
            'SELECT capability, description FROM app_capabilities WHERE app_id = ?',
            [app.id]
        );

        const endpoints = await dbAll(db,
            'SELECT name, method, path, capability, cost_sats, input_schema, output_schema FROM app_endpoints WHERE app_id = ?',
            [app.id]
        );

        const manifest = {
            id: app.id,
            name: app.name,
            description: app.description,
            publisher: app.publisher_id,
            capabilities: capabilities.map(c => c.capability),
            endpoints: {},
            auth: app.auth_method,
            pricing: {
                model: app.pricing_model,
                ...(app.pricing_config ? JSON.parse(app.pricing_config) : {})
            },
            source: app.source_url,
            verification: app.verification_tier,
            trust_score: app.trust_score
        };

        for (const ep of endpoints) {
            manifest.endpoints[ep.name] = {
                method: ep.method,
                path: ep.path,
                capability: ep.capability,
                cost_sats: ep.cost_sats,
                input: ep.input_schema ? JSON.parse(ep.input_schema) : null,
                output: ep.output_schema ? JSON.parse(ep.output_schema) : null
            };
        }

        res.json(manifest);
    } catch (error) {
        console.error('Manifest error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate manifest' });
    } finally {
        db.close();
    }
});

// ─── Categories endpoint ───
router.get('/meta/categories', async (req, res) => {
    const db = getDb();
    try {
        const categories = await dbAll(db,
            `SELECT category, COUNT(*) as app_count
             FROM apps WHERE status = 'active'
             GROUP BY category ORDER BY app_count DESC`
        );
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    } finally {
        db.close();
    }
});

function formatApp(app) {
    const formatted = { ...app };
    if (formatted.capabilities) {
        try { formatted.capabilities = JSON.parse(formatted.capabilities); } catch (e) { /* already parsed or string */ }
    }
    if (formatted.capabilities_list) {
        formatted.capabilities = formatted.capabilities_list.split(',');
        delete formatted.capabilities_list;
    }
    if (formatted.pricing_config && typeof formatted.pricing_config === 'string') {
        try { formatted.pricing_config = JSON.parse(formatted.pricing_config); } catch (e) { /* ok */ }
    }
    return formatted;
}

module.exports = router;
