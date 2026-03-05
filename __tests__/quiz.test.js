/**
 * Tests for standalone /api/quizzes routes.
 *
 * Covers:
 *   - GET  /api/quizzes/course/:courseId  — list quizzes
 *   - GET  /api/quizzes/:id               — get quiz + questions
 *   - POST /api/quizzes (admin)           — create quiz with questions
 *   - PUT  /api/quizzes/:id (admin)       — update quiz
 *   - DELETE /api/quizzes/:id (admin)     — delete quiz
 *   - POST /api/quizzes/:id/submit        — score submission (correct / wrong / max attempts)
 *   - GET  /api/quizzes/:id/results       — get user's attempts
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDbGet = jest.fn();
const mockDbAll = jest.fn();
const mockDbRun = jest.fn();

jest.mock('../marketplace/backend/database/database', () => ({
    get: mockDbGet,
    all: mockDbAll,
    run: mockDbRun
}));

// Pass-through admin mock (next() immediately)
jest.mock('../marketplace/backend/middleware/auth', () => ({
    authenticateAdmin: (req, _res, next) => next(),
    loginLimiter: (_req, _res, next) => next()
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');

const quizRouter = require('../marketplace/backend/routes/quiz');

function buildApp(sessionData = null) {
    const app = express();
    app.use(bodyParser.json());
    app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));
    if (sessionData) {
        app.use((req, _res, next) => {
            Object.assign(req.session, sessionData);
            next();
        });
    }
    app.use('/api/quizzes', quizRouter);
    return app;
}

// Helper to build a mock db.run callback that calls callback with this.lastID
function runMock(lastID = 1) {
    return function(sql, params, callback) {
        callback.call({ lastID, changes: 1 }, null);
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── GET /api/quizzes/course/:courseId ────────────────────────────────────────

describe('GET /api/quizzes/course/:courseId', () => {
    it('returns list of quizzes for a valid course', async () => {
        mockDbAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, [
                { id: 1, title: 'Module 1 Quiz', passing_score: 70, lesson_id: null, created_at: '2026-01-01' }
            ]);
        });
        const res = await request(buildApp()).get('/api/quizzes/course/5');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.quizzes).toHaveLength(1);
        expect(res.body.quizzes[0].title).toBe('Module 1 Quiz');
    });

    it('returns empty array when no quizzes exist', async () => {
        mockDbAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, []);
        });
        const res = await request(buildApp()).get('/api/quizzes/course/99');
        expect(res.status).toBe(200);
        expect(res.body.quizzes).toEqual([]);
    });
});

// ─── GET /api/quizzes/:id ─────────────────────────────────────────────────────

describe('GET /api/quizzes/:id', () => {
    it('returns quiz and questions with answers hidden', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 1, title: 'Test Quiz', passing_score: 70, lesson_id: null, course_id: 5 });
        });
        mockDbAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, [
                { id: 10, question_text: 'What is 2+2?', question_type: 'multiple_choice', options: '["2","3","4","5"]', order_index: 0 }
            ]);
        });

        const res = await request(buildApp()).get('/api/quizzes/1');
        expect(res.status).toBe(200);
        expect(res.body.quiz.title).toBe('Test Quiz');
        expect(res.body.questions).toHaveLength(1);
        // options should be parsed from JSON string to array
        expect(Array.isArray(res.body.questions[0].options)).toBe(true);
        // correct_answer should NOT be in the response
        expect(res.body.questions[0].correct_answer).toBeUndefined();
    });

    it('returns 404 when quiz does not exist', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined);
        });
        const res = await request(buildApp()).get('/api/quizzes/999');
        expect(res.status).toBe(404);
    });
});

// ─── POST /api/quizzes (admin) ────────────────────────────────────────────────

describe('POST /api/quizzes', () => {
    it('creates a quiz with questions and returns quizId', async () => {
        mockDbRun
            .mockImplementationOnce(runMock(42))    // INSERT course_quizzes
            .mockImplementationOnce(runMock(101))   // INSERT quiz_questions[0]
            .mockImplementationOnce(runMock(102));  // INSERT quiz_questions[1]

        const res = await request(buildApp())
            .post('/api/quizzes')
            .send({
                course_id: 5,
                title: 'Final Exam',
                passing_score: 80,
                questions: [
                    { question_text: 'Q1', correct_answer: 'A', question_type: 'multiple_choice', options: ['A','B','C'] },
                    { question_text: 'Q2', correct_answer: 'True', question_type: 'true_false' }
                ]
            });

        expect(res.status).toBe(201);
        expect(res.body.quizId).toBe(42);
        expect(mockDbRun).toHaveBeenCalledTimes(3);
    });

    it('returns 400 when course_id or title is missing', async () => {
        const res = await request(buildApp()).post('/api/quizzes').send({ title: 'No Course' });
        expect(res.status).toBe(400);
        expect(mockDbRun).not.toHaveBeenCalled();
    });
});

// ─── PUT /api/quizzes/:id (admin) ─────────────────────────────────────────────

describe('PUT /api/quizzes/:id', () => {
    it('updates quiz title and passing_score', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 1 });
        });
        mockDbRun.mockImplementationOnce(runMock(0));

        const res = await request(buildApp())
            .put('/api/quizzes/1')
            .send({ title: 'Updated Title', passing_score: 90 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('returns 404 when quiz does not exist', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined);
        });
        const res = await request(buildApp()).put('/api/quizzes/999').send({ title: 'x' });
        expect(res.status).toBe(404);
    });
});

// ─── DELETE /api/quizzes/:id (admin) ─────────────────────────────────────────

describe('DELETE /api/quizzes/:id', () => {
    it('deletes a quiz', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 1 });
        });
        mockDbRun.mockImplementationOnce(runMock(0));

        const res = await request(buildApp()).delete('/api/quizzes/1');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('returns 404 when quiz does not exist', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined);
        });
        const res = await request(buildApp()).delete('/api/quizzes/999');
        expect(res.status).toBe(404);
    });
});

// ─── POST /api/quizzes/:id/submit ─────────────────────────────────────────────

describe('POST /api/quizzes/:id/submit', () => {
    const sessionData = { isAuthenticated: true, email: 'student@example.com' };

    const quiz = { id: 1, passing_score: 70, max_attempts: null };
    const questions = [
        { id: 10, question_text: 'Q1', correct_answer: 'paris', question_type: 'short_answer' },
        { id: 11, question_text: 'Q2', correct_answer: 'true', question_type: 'true_false' },
        { id: 12, question_text: 'Q3', correct_answer: 'b', question_type: 'multiple_choice' }
    ];

    it('scores 100% when all answers are correct', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, quiz);
        });
        mockDbAll
            .mockImplementationOnce((sql, params, callback) => {   // questions
                callback(null, questions);
            })
            .mockImplementationOnce((sql, params, callback) => {   // attempt count
                callback(null, [{ count: 0 }]);
            });
        mockDbRun.mockImplementationOnce(runMock(1));

        const res = await request(buildApp(sessionData))
            .post('/api/quizzes/1/submit')
            .send({ answers: { 10: 'Paris', 11: 'True', 12: 'B' } });

        expect(res.status).toBe(200);
        expect(res.body.score).toBe(100);
        expect(res.body.passed).toBe(true);
        expect(res.body.correct).toBe(3);
        expect(res.body.total).toBe(3);
    });

    it('does not pass when score is below passing_score', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, quiz);
        });
        mockDbAll
            .mockImplementationOnce((sql, params, callback) => {   // questions
                callback(null, questions);
            })
            .mockImplementationOnce((sql, params, callback) => {   // attempt count
                callback(null, [{ count: 0 }]);
            });
        mockDbRun.mockImplementationOnce(runMock(1));

        // All wrong answers
        const res = await request(buildApp(sessionData))
            .post('/api/quizzes/1/submit')
            .send({ answers: { 10: 'london', 11: 'false', 12: 'a' } });

        expect(res.status).toBe(200);
        expect(res.body.score).toBe(0);
        expect(res.body.passed).toBe(false);
    });

    it('returns 401 when user is not authenticated', async () => {
        const res = await request(buildApp())
            .post('/api/quizzes/1/submit')
            .send({ answers: {} });
        expect(res.status).toBe(401);
    });

    it('returns 400 when answers is missing', async () => {
        // answers check happens before any dbAll calls — only dbGet is needed
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, quiz);
        });

        const res = await request(buildApp(sessionData))
            .post('/api/quizzes/1/submit')
            .send({});
        expect(res.status).toBe(400);
    });

    it('enforces max_attempts — returns 429 when limit exceeded', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 1, passing_score: 70, max_attempts: 3 });
        });
        // questions fetched first (must be non-empty to avoid 400), then attempt count
        mockDbAll
            .mockImplementationOnce((sql, params, callback) => {   // questions
                callback(null, [{ id: 10, question_text: 'Q', correct_answer: 'a' }]);
            })
            .mockImplementationOnce((sql, params, callback) => {   // attempt count
                callback(null, [{ count: 3 }]); // already used 3 attempts
            });

        const res = await request(buildApp(sessionData))
            .post('/api/quizzes/1/submit')
            .send({ answers: { 10: 'paris' } });

        expect(res.status).toBe(429);
        expect(res.body.error).toMatch(/maximum attempts/i);
    });
});

// ─── GET /api/quizzes/:id/results ─────────────────────────────────────────────

describe('GET /api/quizzes/:id/results', () => {
    const sessionData = { isAuthenticated: true, email: 'student@example.com' };

    it('returns attempts and best score for authenticated user', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 1, title: 'Test Quiz', passing_score: 70 });
        });
        mockDbAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, [
                { id: 5, score: 60, passed: 0, attempted_at: '2026-01-10' },
                { id: 6, score: 85, passed: 1, attempted_at: '2026-01-11' }
            ]);
        });

        const res = await request(buildApp(sessionData)).get('/api/quizzes/1/results');
        expect(res.status).toBe(200);
        expect(res.body.attempts).toHaveLength(2);
        expect(res.body.best_score).toBe(85);
        expect(res.body.passed).toBe(true);
    });

    it('returns 401 for unauthenticated request', async () => {
        const res = await request(buildApp()).get('/api/quizzes/1/results');
        expect(res.status).toBe(401);
    });

    it('returns 404 when quiz does not exist', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined);
        });
        const res = await request(buildApp(sessionData)).get('/api/quizzes/999/results');
        expect(res.status).toBe(404);
    });
});
