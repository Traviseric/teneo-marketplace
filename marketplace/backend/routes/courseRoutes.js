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
const certificateService = require('../services/certificateService');

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

// ─── Quiz Routes ──────────────────────────────────────────────────────────────

// GET /api/courses/:slug/quizzes — list quizzes for a course (enrolled users only)
router.get('/:slug/quizzes', requireEnrollment, async (req, res) => {
    try {
        const quizzes = await dbAll(
            'SELECT id, title, passing_score, lesson_id, created_at FROM course_quizzes WHERE course_id = ? ORDER BY id',
            [req.course.id]
        );
        res.json({ success: true, quizzes });
    } catch (error) {
        console.error('List quizzes error:', error);
        res.status(500).json({ success: false, error: 'Failed to list quizzes' });
    }
});

// GET /api/courses/:slug/quiz/:quizId — get quiz questions (correct answers hidden)
router.get('/:slug/quiz/:quizId', requireEnrollment, async (req, res) => {
    try {
        const quiz = await dbGet(
            'SELECT id, title, passing_score, lesson_id FROM course_quizzes WHERE id = ? AND course_id = ?',
            [req.params.quizId, req.course.id]
        );
        if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

        const questions = await dbAll(
            'SELECT id, question_text, question_type, options, order_index FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index',
            [quiz.id]
        );
        // Parse options JSON for each question
        for (const q of questions) {
            if (q.options) {
                try { q.options = JSON.parse(q.options); } catch (_) {}
            }
        }

        res.json({ success: true, quiz, questions });
    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({ success: false, error: 'Failed to get quiz' });
    }
});

// POST /api/courses/:slug/quiz/:quizId/submit — submit quiz answers
router.post('/:slug/quiz/:quizId/submit', requireEnrollment, async (req, res) => {
    try {
        const quiz = await dbGet(
            'SELECT * FROM course_quizzes WHERE id = ? AND course_id = ?',
            [req.params.quizId, req.course.id]
        );
        if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

        const { answers } = req.body; // { questionId: submittedAnswer, ... }
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ success: false, error: 'answers object is required' });
        }

        const questions = await dbAll('SELECT * FROM quiz_questions WHERE quiz_id = ?', [quiz.id]);
        if (questions.length === 0) {
            return res.status(400).json({ success: false, error: 'Quiz has no questions' });
        }

        let correct = 0;
        for (const q of questions) {
            const submitted = String(answers[q.id] || '').trim().toLowerCase();
            const expected = String(q.correct_answer || '').trim().toLowerCase();
            if (submitted === expected) correct++;
        }

        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= quiz.passing_score;
        const email = req.session.email.toLowerCase();

        await dbRun(
            'INSERT INTO quiz_attempts (quiz_id, user_email, score, passed, answers) VALUES (?, ?, ?, ?, ?)',
            [quiz.id, email, score, passed ? 1 : 0, JSON.stringify(answers)]
        );

        res.json({
            success: true,
            score,
            passed,
            passing_score: quiz.passing_score,
            correct,
            total: questions.length
        });
    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit quiz' });
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

// POST /api/courses/admin/courses/:slug/quiz — create quiz with questions
router.post('/admin/courses/:slug/quiz', authenticateAdmin, async (req, res) => {
    try {
        const course = await dbGet('SELECT id FROM courses WHERE slug = ?', [req.params.slug]);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const { title, passing_score, lesson_id, questions } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'title is required' });

        const quizResult = await dbRun(
            'INSERT INTO course_quizzes (course_id, lesson_id, title, passing_score) VALUES (?, ?, ?, ?)',
            [course.id, lesson_id || null, title, passing_score || 70]
        );
        const quizId = quizResult.lastID;

        if (Array.isArray(questions)) {
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                await dbRun(
                    'INSERT INTO quiz_questions (quiz_id, question_text, question_type, correct_answer, options, order_index) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        quizId,
                        q.question_text,
                        q.question_type || 'multiple_choice',
                        q.correct_answer,
                        q.options ? JSON.stringify(q.options) : null,
                        q.order_index !== undefined ? q.order_index : i
                    ]
                );
            }
        }

        res.json({ success: true, quizId });
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ success: false, error: 'Failed to create quiz' });
    }
});

// PUT /api/courses/admin/courses/:slug/quiz/:quizId — update quiz
router.put('/admin/courses/:slug/quiz/:quizId', authenticateAdmin, async (req, res) => {
    try {
        const course = await dbGet('SELECT id FROM courses WHERE slug = ?', [req.params.slug]);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const quiz = await dbGet('SELECT id FROM course_quizzes WHERE id = ? AND course_id = ?', [req.params.quizId, course.id]);
        if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

        const { title, passing_score } = req.body;
        await dbRun(
            'UPDATE course_quizzes SET title = COALESCE(?, title), passing_score = COALESCE(?, passing_score) WHERE id = ?',
            [title || null, passing_score !== undefined ? passing_score : null, quiz.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update quiz error:', error);
        res.status(500).json({ success: false, error: 'Failed to update quiz' });
    }
});

// ─── Certificate Routes ───────────────────────────────────────────────────────

// POST /api/courses/:slug/claim-certificate — claim certificate if eligible
router.post('/:slug/claim-certificate', requireEnrollment, async (req, res) => {
    try {
        const email = req.session.email.toLowerCase();
        const { eligible, reasons } = await certificateService.isEligible(email, req.course.id);

        if (!eligible) {
            return res.status(400).json({ success: false, error: 'Not yet eligible', reasons });
        }

        const course = await dbGet('SELECT title FROM courses WHERE id = ?', [req.course.id]);
        const userName = req.session.name || req.session.email.split('@')[0];
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const { certId, verificationUrl } = await certificateService.generateCertificate(
            email, req.course.id, course.title, userName, baseUrl
        );

        res.json({ success: true, certId, verificationUrl, certificateUrl: `/api/courses/certificate/${certId}` });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE')) {
            // Already issued — return existing cert
            const existing = await dbGet(
                'SELECT id, verification_url FROM course_certificates WHERE course_id = ? AND user_email = ?',
                [req.course.id, req.session.email.toLowerCase()]
            );
            if (existing) {
                return res.json({
                    success: true,
                    certId: existing.id,
                    verificationUrl: existing.verification_url,
                    certificateUrl: `/api/courses/certificate/${existing.id}`
                });
            }
        }
        console.error('Claim certificate error:', error);
        res.status(500).json({ success: false, error: 'Failed to issue certificate' });
    }
});

// GET /api/courses/certificate/:certId — render printable HTML certificate
router.get('/certificate/:certId', async (req, res) => {
    try {
        const cert = await certificateService.getCertificate(req.params.certId);
        if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });

        // Only the certificate holder or an authenticated admin may view this route
        const email = req.session && req.session.email ? req.session.email.toLowerCase() : null;
        const isAdmin = req.session && req.session.isAdmin;
        if (!isAdmin && email !== cert.user_email) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const userName = email ? email.split('@')[0] : 'Student';
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const certHtml = buildCertHtmlFromRecord(cert, userName, baseUrl);

        res.setHeader('Content-Type', 'text/html');
        res.send(certHtml);
    } catch (error) {
        console.error('View certificate error:', error);
        res.status(500).json({ success: false, error: 'Failed to load certificate' });
    }
});

// GET /api/verify/certificate/:certId — public verification (no auth needed, no email exposed)
router.get('/verify/:certId', async (req, res) => {
    try {
        const cert = await certificateService.getCertificate(req.params.certId);
        if (!cert) return res.status(404).json({ success: false, error: 'Certificate not found' });

        res.json({
            success: true,
            valid: true,
            course: cert.course_title,
            issued_at: cert.issued_at
            // Note: user_email intentionally omitted from public response
        });
    } catch (error) {
        console.error('Verify certificate error:', error);
        res.status(500).json({ success: false, error: 'Failed to verify certificate' });
    }
});

/**
 * Build certificate HTML from an existing DB record without re-inserting.
 */
function buildCertHtmlFromRecord(cert, userName, baseUrl) {
    const date = new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const verificationUrl = cert.verification_url || `${baseUrl}/api/verify/certificate/${cert.id}`;
    const esc = (s) => String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificate of Completion — ${esc(cert.course_title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #f5f0e8; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
  .cert { background: #fff; width: 860px; padding: 60px 80px; border: 12px solid #c8a96e; position: relative; text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,.15); }
  .cert::before { content: ''; position: absolute; inset: 8px; border: 2px solid #c8a96e; pointer-events: none; }
  .logo { font-family: 'Playfair Display', serif; font-size: 28px; color: #2c2c2c; letter-spacing: 4px; text-transform: uppercase; }
  .subtitle { font-size: 12px; letter-spacing: 6px; text-transform: uppercase; color: #888; margin-top: 4px; }
  .divider { width: 120px; height: 2px; background: #c8a96e; margin: 24px auto; }
  .presents { font-size: 14px; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
  .recipient { font-family: 'Playfair Display', serif; font-size: 42px; color: #1a1a1a; margin-bottom: 16px; }
  .body-text { font-size: 14px; color: #555; line-height: 1.8; max-width: 560px; margin: 0 auto 12px; }
  .course-name { font-family: 'Playfair Display', serif; font-size: 22px; color: #2c2c2c; margin-bottom: 24px; }
  .date { font-size: 13px; color: #888; margin-bottom: 32px; }
  .verify { font-size: 11px; color: #aaa; word-break: break-all; }
  .cert-id { font-size: 10px; color: #ccc; margin-top: 8px; }
  @media print { body { background: none; } .cert { box-shadow: none; } }
</style>
</head>
<body>
<div class="cert">
  <div class="logo">Teneo</div>
  <div class="subtitle">Academy</div>
  <div class="divider"></div>
  <div class="presents">This certifies that</div>
  <div class="recipient">${esc(userName)}</div>
  <div class="body-text">has successfully completed the course</div>
  <div class="course-name">${esc(cert.course_title)}</div>
  <div class="date">Issued on ${esc(date)}</div>
  <div class="divider"></div>
  <div class="verify">Verify at: ${esc(verificationUrl)}</div>
  <div class="cert-id">Certificate ID: ${esc(cert.id)}</div>
</div>
</body>
</html>`;
}

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
