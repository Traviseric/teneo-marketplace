/**
 * Standalone Quiz Routes
 *
 * Provides a RESTful /api/quizzes interface for managing and taking quizzes.
 * Quiz data is stored in course_quizzes, quiz_questions, quiz_attempts tables
 * (defined in database/schema-courses.sql).
 *
 * Public / learner:
 *   GET  /api/quizzes/course/:courseId  — list quizzes for a course
 *   GET  /api/quizzes/:id               — get quiz with questions (answers hidden)
 *   POST /api/quizzes/:id/submit        — submit answers, get score
 *   GET  /api/quizzes/:id/results       — get current user's attempts
 *
 * Admin (authenticateAdmin required):
 *   POST   /api/quizzes                 — create quiz with questions
 *   PUT    /api/quizzes/:id             — update quiz title / passing_score
 *   DELETE /api/quizzes/:id             — delete quiz
 *   POST   /api/quizzes/:id/questions   — add a question to a quiz
 *   DELETE /api/quizzes/:id/questions/:qid — remove a question
 */

const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { authenticateAdmin } = require('../middleware/auth');

// ─── DB helpers ───────────────────────────────────────────────────────────────

function dbGet(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

function dbAll(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

function dbRun(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err); else resolve(this);
        });
    });
}

// ─── Public / learner routes ──────────────────────────────────────────────────

// GET /api/quizzes/course/:courseId — list quizzes for a course
router.get('/course/:courseId', async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId, 10);
        if (!Number.isInteger(courseId)) {
            return res.status(400).json({ success: false, error: 'Invalid course ID' });
        }
        const quizzes = await dbAll(
            'SELECT id, title, passing_score, lesson_id, created_at FROM course_quizzes WHERE course_id = ? ORDER BY id',
            [courseId]
        );
        res.json({ success: true, quizzes });
    } catch (error) {
        console.error('List quizzes error:', error);
        res.status(500).json({ success: false, error: 'Failed to list quizzes' });
    }
});

// GET /api/quizzes/:id — get quiz with questions (correct answers hidden)
router.get('/:id', async (req, res) => {
    try {
        const quiz = await dbGet(
            'SELECT id, title, passing_score, lesson_id, course_id FROM course_quizzes WHERE id = ?',
            [req.params.id]
        );
        if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

        const questions = await dbAll(
            'SELECT id, question_text, question_type, options, order_index FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index',
            [quiz.id]
        );
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

// POST /api/quizzes/:id/submit — submit quiz answers
router.post('/:id/submit', async (req, res) => {
    try {
        if (!req.session || !req.session.isAuthenticated || !req.session.email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const quiz = await dbGet('SELECT * FROM course_quizzes WHERE id = ?', [req.params.id]);
        if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

        const { answers } = req.body;
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ success: false, error: 'answers object is required' });
        }

        const questions = await dbAll('SELECT * FROM quiz_questions WHERE quiz_id = ?', [quiz.id]);
        if (questions.length === 0) {
            return res.status(400).json({ success: false, error: 'Quiz has no questions' });
        }

        // Check max attempts if defined
        const email = req.session.email.toLowerCase();
        const attempts = await dbAll(
            'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ? AND user_email = ?',
            [quiz.id, email]
        );
        const attemptCount = attempts[0] ? attempts[0].count : 0;
        const maxAttempts = quiz.max_attempts || null;
        if (maxAttempts !== null && attemptCount >= maxAttempts) {
            return res.status(429).json({
                success: false,
                error: `Maximum attempts (${maxAttempts}) reached for this quiz`
            });
        }

        // Score the submission
        let correct = 0;
        for (const q of questions) {
            const submitted = String(answers[q.id] || '').trim().toLowerCase();
            const expected = String(q.correct_answer || '').trim().toLowerCase();
            if (submitted === expected) correct++;
        }

        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= quiz.passing_score;

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
            total: questions.length,
            attempt_number: attemptCount + 1
        });
    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit quiz' });
    }
});

// GET /api/quizzes/:id/results — get current user's quiz attempts
router.get('/:id/results', async (req, res) => {
    try {
        if (!req.session || !req.session.isAuthenticated || !req.session.email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const quiz = await dbGet('SELECT id, title, passing_score FROM course_quizzes WHERE id = ?', [req.params.id]);
        if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

        const email = req.session.email.toLowerCase();
        const attempts = await dbAll(
            'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE quiz_id = ? AND user_email = ? ORDER BY attempted_at DESC',
            [quiz.id, email]
        );

        const best = attempts.reduce((b, a) => (!b || a.score > b.score ? a : b), null);

        res.json({
            success: true,
            quiz: { id: quiz.id, title: quiz.title, passing_score: quiz.passing_score },
            attempts,
            best_score: best ? best.score : null,
            passed: attempts.some(a => a.passed)
        });
    } catch (error) {
        console.error('Get quiz results error:', error);
        res.status(500).json({ success: false, error: 'Failed to get quiz results' });
    }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

// POST /api/quizzes — create quiz with optional questions
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const { course_id, title, passing_score, lesson_id, questions } = req.body;
        if (!course_id || !title) {
            return res.status(400).json({ success: false, error: 'course_id and title are required' });
        }

        const quizResult = await dbRun(
            'INSERT INTO course_quizzes (course_id, lesson_id, title, passing_score) VALUES (?, ?, ?, ?)',
            [course_id, lesson_id || null, title, passing_score !== undefined ? passing_score : 70]
        );
        const quizId = quizResult.lastID;

        if (Array.isArray(questions)) {
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (!q.question_text || !q.correct_answer) continue;
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

        res.status(201).json({ success: true, quizId });
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ success: false, error: 'Failed to create quiz' });
    }
});

// PUT /api/quizzes/:id — update quiz title / passing_score
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const quiz = await dbGet('SELECT id FROM course_quizzes WHERE id = ?', [req.params.id]);
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

// DELETE /api/quizzes/:id — delete quiz (cascades to questions and attempts)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const quiz = await dbGet('SELECT id FROM course_quizzes WHERE id = ?', [req.params.id]);
        if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

        await dbRun('DELETE FROM course_quizzes WHERE id = ?', [quiz.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete quiz error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete quiz' });
    }
});

// POST /api/quizzes/:id/questions — add a question to a quiz
router.post('/:id/questions', authenticateAdmin, async (req, res) => {
    try {
        const quiz = await dbGet('SELECT id FROM course_quizzes WHERE id = ?', [req.params.id]);
        if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

        const { question_text, question_type, correct_answer, options, order_index } = req.body;
        if (!question_text || !correct_answer) {
            return res.status(400).json({ success: false, error: 'question_text and correct_answer are required' });
        }

        const result = await dbRun(
            'INSERT INTO quiz_questions (quiz_id, question_text, question_type, correct_answer, options, order_index) VALUES (?, ?, ?, ?, ?, ?)',
            [
                quiz.id,
                question_text,
                question_type || 'multiple_choice',
                correct_answer,
                options ? JSON.stringify(options) : null,
                order_index !== undefined ? order_index : 0
            ]
        );

        res.status(201).json({ success: true, questionId: result.lastID });
    } catch (error) {
        console.error('Add question error:', error);
        res.status(500).json({ success: false, error: 'Failed to add question' });
    }
});

// DELETE /api/quizzes/:id/questions/:qid — remove a question
router.delete('/:id/questions/:qid', authenticateAdmin, async (req, res) => {
    try {
        const question = await dbGet(
            'SELECT id FROM quiz_questions WHERE id = ? AND quiz_id = ?',
            [req.params.qid, req.params.id]
        );
        if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

        await dbRun('DELETE FROM quiz_questions WHERE id = ?', [question.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete question' });
    }
});

module.exports = router;
