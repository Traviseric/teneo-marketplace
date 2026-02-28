/**
 * Course Platform Routes
 *
 * Public:
 *   GET  /api/courses            - list published courses
 *   GET  /api/courses/:slug      - course detail + curriculum
 *   GET  /api/courses/:slug/preview - free preview lessons
 *
 * Enrolled users (session-authenticated):
 *   GET  /api/courses/:slug/learn          - full course (checks enrollment)
 *   GET  /api/courses/:slug/lessons/:id    - individual lesson
 *   POST /api/courses/:slug/progress/:id   - mark lesson complete
 *   GET  /api/courses/:slug/progress       - user progress
 *
 * Admin:
 *   POST /api/courses/admin/courses              - create course
 *   PUT  /api/courses/admin/courses/:id          - update course
 *   POST /api/courses/admin/courses/:id/publish  - publish course
 *   POST /api/courses/admin/courses/:id/modules  - add module
 *   POST /api/courses/admin/modules/:id/lessons  - add lesson
 */

const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { authenticateAdmin } = require('../middleware/auth');

// Helper: promisified db.get
function dbGet(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

// Helper: promisified db.all
function dbAll(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

// Helper: promisified db.run
function dbRun(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err); else resolve(this);
        });
    });
}

// ─── Public Routes ────────────────────────────────────────────────────────────

// GET /api/courses — list published courses
router.get('/', async (req, res) => {
    try {
        const { brand_id } = req.query;
        let sql = 'SELECT * FROM courses WHERE is_published = 1';
        const params = [];
        if (brand_id) {
            sql += ' AND brand_id = ?';
            params.push(brand_id);
        }
        sql += ' ORDER BY created_at DESC';
        const courses = await dbAll(sql, params);
        res.json({ success: true, courses });
    } catch (error) {
        console.error('List courses error:', error);
        res.status(500).json({ success: false, error: 'Failed to list courses' });
    }
});

// GET /api/courses/:slug — course detail with curriculum (no lesson content)
router.get('/:slug', async (req, res) => {
    try {
        const course = await dbGet('SELECT * FROM courses WHERE slug = ? AND is_published = 1', [req.params.slug]);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const modules = await dbAll('SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index', [course.id]);
        for (const mod of modules) {
            mod.lessons = await dbAll(
                'SELECT id, title, content_type, order_index, is_free_preview FROM course_lessons WHERE module_id = ? ORDER BY order_index',
                [mod.id]
            );
        }

        res.json({ success: true, course: { ...course, modules } });
    } catch (error) {
        console.error('Course detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to get course' });
    }
});

// GET /api/courses/:slug/preview — free preview lessons with content
router.get('/:slug/preview', async (req, res) => {
    try {
        const course = await dbGet('SELECT * FROM courses WHERE slug = ? AND is_published = 1', [req.params.slug]);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const lessons = await dbAll(
            `SELECT cl.* FROM course_lessons cl
             JOIN course_modules cm ON cl.module_id = cm.id
             WHERE cm.course_id = ? AND cl.is_free_preview = 1
             ORDER BY cm.order_index, cl.order_index`,
            [course.id]
        );

        res.json({ success: true, lessons });
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ success: false, error: 'Failed to get preview' });
    }
});

// ─── Enrolled User Routes ─────────────────────────────────────────────────────

// Middleware: check enrollment via session authentication
async function requireEnrollment(req, res, next) {
    // Require active session — user must be logged in
    if (!req.session || !req.session.isAuthenticated || !req.session.email) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Please log in to access course content.'
        });
    }

    const email = req.session.email; // Use session email only — never trust query/body email

    try {
        const course = await dbGet('SELECT id FROM courses WHERE slug = ?', [req.params.slug]);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const enrollment = await dbGet(
            'SELECT * FROM course_enrollments WHERE course_id = ? AND user_email = ?',
            [course.id, email.toLowerCase()]
        );
        if (!enrollment) return res.status(403).json({ success: false, error: 'Not enrolled in this course' });
        if (enrollment.expires_at && new Date(enrollment.expires_at) < new Date()) {
            return res.status(403).json({ success: false, error: 'Course access has expired' });
        }

        req.enrollment = enrollment;
        req.course = course;
        next();
    } catch (error) {
        console.error('Enrollment check error:', error);
        res.status(500).json({ success: false, error: 'Failed to verify enrollment' });
    }
}

// GET /api/courses/:slug/learn — full curriculum for enrolled users
router.get('/:slug/learn', requireEnrollment, async (req, res) => {
    try {
        const modules = await dbAll('SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index', [req.course.id]);
        for (const mod of modules) {
            mod.lessons = await dbAll(
                'SELECT * FROM course_lessons WHERE module_id = ? ORDER BY order_index',
                [mod.id]
            );
        }

        const progress = await dbAll(
            'SELECT lesson_id FROM course_progress WHERE enrollment_id = ?',
            [req.enrollment.id]
        );
        const completedIds = new Set(progress.map(p => p.lesson_id));

        res.json({ success: true, modules, completedLessons: [...completedIds] });
    } catch (error) {
        console.error('Learn error:', error);
        res.status(500).json({ success: false, error: 'Failed to load course' });
    }
});

// GET /api/courses/:slug/lessons/:lessonId — individual lesson content
router.get('/:slug/lessons/:lessonId', requireEnrollment, async (req, res) => {
    try {
        const lesson = await dbGet(
            `SELECT cl.* FROM course_lessons cl
             JOIN course_modules cm ON cl.module_id = cm.id
             WHERE cl.id = ? AND cm.course_id = ?`,
            [req.params.lessonId, req.course.id]
        );
        if (!lesson) return res.status(404).json({ success: false, error: 'Lesson not found' });
        res.json({ success: true, lesson });
    } catch (error) {
        console.error('Lesson error:', error);
        res.status(500).json({ success: false, error: 'Failed to get lesson' });
    }
});

// POST /api/courses/:slug/progress/:lessonId — mark lesson complete
router.post('/:slug/progress/:lessonId', requireEnrollment, async (req, res) => {
    try {
        await dbRun(
            'INSERT OR IGNORE INTO course_progress (enrollment_id, lesson_id) VALUES (?, ?)',
            [req.enrollment.id, req.params.lessonId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Progress error:', error);
        res.status(500).json({ success: false, error: 'Failed to update progress' });
    }
});

// GET /api/courses/:slug/progress — user progress summary
router.get('/:slug/progress', requireEnrollment, async (req, res) => {
    try {
        const totalLessons = await dbGet(
            `SELECT COUNT(*) as count FROM course_lessons cl
             JOIN course_modules cm ON cl.module_id = cm.id
             WHERE cm.course_id = ?`,
            [req.course.id]
        );
        const completedLessons = await dbGet(
            'SELECT COUNT(*) as count FROM course_progress WHERE enrollment_id = ?',
            [req.enrollment.id]
        );
        const pct = totalLessons.count > 0
            ? Math.round((completedLessons.count / totalLessons.count) * 100)
            : 0;
        res.json({ success: true, total: totalLessons.count, completed: completedLessons.count, percentage: pct });
    } catch (error) {
        console.error('Progress summary error:', error);
        res.status(500).json({ success: false, error: 'Failed to get progress' });
    }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// POST /api/courses/admin/courses — create course
router.post('/admin/courses', authenticateAdmin, async (req, res) => {
    try {
        const { brand_id, title, slug, description, price_cents } = req.body;
        if (!brand_id || !title || !slug) {
            return res.status(400).json({ success: false, error: 'brand_id, title, and slug are required' });
        }
        const result = await dbRun(
            'INSERT INTO courses (brand_id, title, slug, description, price_cents) VALUES (?, ?, ?, ?, ?)',
            [brand_id, title, slug, description || '', price_cents || 0]
        );
        res.json({ success: true, courseId: result.lastID });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(409).json({ success: false, error: 'Slug already exists' });
        }
        console.error('Create course error:', error);
        res.status(500).json({ success: false, error: 'Failed to create course' });
    }
});

// PUT /api/courses/admin/courses/:id — update course
router.put('/admin/courses/:id', authenticateAdmin, async (req, res) => {
    try {
        const { title, description, price_cents } = req.body;
        await dbRun(
            'UPDATE courses SET title = ?, description = ?, price_cents = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, description, price_cents, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ success: false, error: 'Failed to update course' });
    }
});

// POST /api/courses/admin/courses/:id/publish — toggle publish
router.post('/admin/courses/:id/publish', authenticateAdmin, async (req, res) => {
    try {
        const course = await dbGet('SELECT is_published FROM courses WHERE id = ?', [req.params.id]);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
        const newState = course.is_published ? 0 : 1;
        await dbRun('UPDATE courses SET is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newState, req.params.id]);
        res.json({ success: true, is_published: newState });
    } catch (error) {
        console.error('Publish course error:', error);
        res.status(500).json({ success: false, error: 'Failed to publish course' });
    }
});

// POST /api/courses/admin/courses/:id/modules — add module
router.post('/admin/courses/:id/modules', authenticateAdmin, async (req, res) => {
    try {
        const { title, order_index } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'title is required' });
        const result = await dbRun(
            'INSERT INTO course_modules (course_id, title, order_index) VALUES (?, ?, ?)',
            [req.params.id, title, order_index || 0]
        );
        res.json({ success: true, moduleId: result.lastID });
    } catch (error) {
        console.error('Add module error:', error);
        res.status(500).json({ success: false, error: 'Failed to add module' });
    }
});

// POST /api/courses/admin/modules/:id/lessons — add lesson
router.post('/admin/modules/:id/lessons', authenticateAdmin, async (req, res) => {
    try {
        const { title, content_type, content_url, content_body, order_index, is_free_preview } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'title is required' });
        const result = await dbRun(
            `INSERT INTO course_lessons (module_id, title, content_type, content_url, content_body, order_index, is_free_preview)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, title, content_type || 'video', content_url || '', content_body || '', order_index || 0, is_free_preview ? 1 : 0]
        );
        res.json({ success: true, lessonId: result.lastID });
    } catch (error) {
        console.error('Add lesson error:', error);
        res.status(500).json({ success: false, error: 'Failed to add lesson' });
    }
});

// ─── Enrollment Helper (called by Stripe webhook) ─────────────────────────────

/**
 * Enroll a user in a course after purchase.
 * Called from the Stripe checkout.session.completed webhook handler.
 * @param {string} courseSlug
 * @param {string} userEmail
 * @param {string} orderId
 */
async function enrollUserInCourse(courseSlug, userEmail, orderId) {
    const course = await dbGet('SELECT id FROM courses WHERE slug = ?', [courseSlug]);
    if (!course) throw new Error(`Course not found: ${courseSlug}`);

    await dbRun(
        `INSERT OR IGNORE INTO course_enrollments (course_id, user_email, order_id) VALUES (?, ?, ?)`,
        [course.id, userEmail.toLowerCase(), orderId]
    );
}

module.exports = router;
module.exports.enrollUserInCourse = enrollUserInCourse;
