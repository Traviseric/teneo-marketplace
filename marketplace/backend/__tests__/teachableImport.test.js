'use strict';
/**
 * Tests for teachableImportService.js
 * Coverage: parseTeachableExport(), importToDatabase()
 */

process.env.NODE_ENV = 'test';

const { parseTeachableExport, importToDatabase } = require('../services/teachableImportService');

// ── Sample Teachable export fixture ──────────────────────────────────────────

const SAMPLE_EXPORT = {
    courses: [
        {
            id: 101,
            name: 'Intro to Node.js',
            heading: 'Learn Node from scratch',
            description: '<p>Full Node.js course</p>',
            price: '49.00',
            is_published: true,
            slug: 'intro-to-nodejs',
            sections: [
                {
                    id: 201,
                    name: 'Getting Started',
                    lectures: [
                        {
                            id: 301,
                            name: 'Welcome Video',
                            lecture_type: 'video',
                            media_url: 'https://cdn.example.com/video1.mp4',
                            body: '',
                            is_published: true,
                            free_preview: true,
                        },
                        {
                            id: 302,
                            name: 'Setup Guide',
                            lecture_type: 'text',
                            media_url: '',
                            body: '<p>Install Node.js</p>',
                            is_published: true,
                            free_preview: false,
                        },
                    ],
                },
                {
                    id: 202,
                    name: 'Advanced Topics',
                    lectures: [
                        {
                            id: 303,
                            name: 'Async/Await',
                            lecture_type: 'video',
                            media_url: 'https://cdn.example.com/video2.mp4',
                            body: '',
                            is_published: true,
                            free_preview: false,
                        },
                    ],
                },
            ],
        },
        {
            id: 102,
            name: 'Advanced JavaScript',
            price: '0',
            is_published: false,
            sections: [],
        },
    ],
    students: [
        {
            email: 'alice@example.com',
            name: 'Alice Smith',
            enrolled_courses: [101],
        },
        {
            email: 'bob@example.com',
            name: 'Bob Jones',
            enrolled_courses: [101, 102],
        },
        {
            email: 'invalid-email',
            name: 'Bad User',
            enrolled_courses: [101],
        },
    ],
};

// ── parseTeachableExport tests ────────────────────────────────────────────────

describe('parseTeachableExport', () => {
    test('parses courses from JSON string', () => {
        const result = parseTeachableExport(JSON.stringify(SAMPLE_EXPORT));
        expect(result.courses).toHaveLength(2);
    });

    test('parses courses from object', () => {
        const result = parseTeachableExport(SAMPLE_EXPORT);
        expect(result.courses).toHaveLength(2);
    });

    test('maps course fields correctly', () => {
        const { courses } = parseTeachableExport(SAMPLE_EXPORT);
        const course = courses[0];
        expect(course.title).toBe('Intro to Node.js');
        expect(course.slug).toBe('intro-to-nodejs');
        expect(course.price_cents).toBe(4900);
        expect(course.is_published).toBe(1);
        expect(course.teachable_course_id).toBe(101);
    });

    test('maps unpublished course', () => {
        const { courses } = parseTeachableExport(SAMPLE_EXPORT);
        expect(courses[1].is_published).toBe(0);
        expect(courses[1].price_cents).toBe(0);
    });

    test('maps sections to modules', () => {
        const { courses } = parseTeachableExport(SAMPLE_EXPORT);
        expect(courses[0].modules).toHaveLength(2);
        expect(courses[0].modules[0].title).toBe('Getting Started');
        expect(courses[0].modules[0].order_index).toBe(0);
    });

    test('maps lectures to lessons with correct content type', () => {
        const { courses } = parseTeachableExport(SAMPLE_EXPORT);
        const lessons = courses[0].modules[0].lessons;
        expect(lessons).toHaveLength(2);
        expect(lessons[0].title).toBe('Welcome Video');
        expect(lessons[0].content_type).toBe('video');
        expect(lessons[0].content_url).toBe('https://cdn.example.com/video1.mp4');
        expect(lessons[0].is_free_preview).toBe(1);
        expect(lessons[1].content_type).toBe('text');
        expect(lessons[1].is_free_preview).toBe(0);
    });

    test('parses students, skipping invalid emails', () => {
        const { students, errors } = parseTeachableExport(SAMPLE_EXPORT);
        expect(students).toHaveLength(2);
        expect(students[0].email).toBe('alice@example.com');
        expect(students[0].enrolled_course_ids).toEqual([101]);
        expect(errors.some(e => e.includes('invalid-email'))).toBe(true);
    });

    test('throws on invalid JSON string', () => {
        expect(() => parseTeachableExport('not json')).toThrow('Invalid JSON');
    });

    test('throws on non-object input', () => {
        expect(() => parseTeachableExport(null)).toThrow();
    });

    test('handles empty courses and students arrays', () => {
        const result = parseTeachableExport({ courses: [], students: [] });
        expect(result.courses).toHaveLength(0);
        expect(result.students).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
    });

    test('skips course with missing name', () => {
        const input = { courses: [{ id: 1, price: '10' }], students: [] };
        const { courses, errors } = parseTeachableExport(input);
        expect(courses).toHaveLength(0);
        expect(errors.some(e => e.includes('missing name'))).toBe(true);
    });

    test('supports alternate field names: title, users', () => {
        const input = {
            courses: [{ id: 1, title: 'My Course', price: '0', sections: [] }],
            users: [{ email: 'user@test.com', enrolled_courses: [1] }],
        };
        const { courses, students } = parseTeachableExport(input);
        expect(courses[0].title).toBe('My Course');
        expect(students[0].email).toBe('user@test.com');
    });

    test('maps lecture types correctly', () => {
        const input = {
            courses: [{
                id: 1, name: 'Test', sections: [{
                    id: 10, name: 'S1',
                    lectures: [
                        { id: 1, name: 'L1', lecture_type: 'pdf' },
                        { id: 2, name: 'L2', lecture_type: 'audio' },
                        { id: 3, name: 'L3', lecture_type: 'quiz' },
                        { id: 4, name: 'L4', lecture_type: 'unknown' },
                    ]
                }]
            }],
            students: []
        };
        const { courses } = parseTeachableExport(input);
        const lessons = courses[0].modules[0].lessons;
        expect(lessons[0].content_type).toBe('pdf');
        expect(lessons[1].content_type).toBe('audio');
        expect(lessons[2].content_type).toBe('quiz');
        expect(lessons[3].content_type).toBe('text');
    });

    test('generates slug from name when slug not provided', () => {
        const input = { courses: [{ id: 1, name: 'Hello World!', sections: [] }], students: [] };
        const { courses } = parseTeachableExport(input);
        expect(courses[0].slug).toBe('hello-world');
    });
});

// ── importToDatabase tests ────────────────────────────────────────────────────

describe('importToDatabase', () => {
    function makeMockDb() {
        let idCounter = 1;
        return {
            run: jest.fn((sql, params, cb) => {
                cb.call({ lastID: idCounter++, changes: 1 }, null);
            }),
            get: jest.fn((sql, params, cb) => {
                // Return null for slug uniqueness checks (no collision)
                cb(null, null);
            }),
        };
    }

    test('inserts courses, modules, lessons, students, and enrollments', async () => {
        const db = makeMockDb();
        const parsed = parseTeachableExport(SAMPLE_EXPORT);
        const result = await importToDatabase(parsed, db, 'test-brand');

        expect(result.courses).toBe(2);
        expect(result.modules).toBe(2);
        expect(result.lessons).toBe(3);
        expect(result.students).toBe(2); // invalid email skipped
        // alice: course 101 (1 enrollment); bob: courses 101 + 102 (2 enrollments) → total 3
        expect(result.enrollments).toBe(3);
    });

    test('returns error list from parseTeachableExport', async () => {
        const db = makeMockDb();
        const parsed = parseTeachableExport(SAMPLE_EXPORT);
        const result = await importToDatabase(parsed, db, 'test-brand');
        // The invalid email error from parse is forwarded
        expect(result.errors.some(e => e.includes('invalid-email'))).toBe(true);
    });

    test('handles DB error on course insert gracefully', async () => {
        const db = {
            run: jest.fn((sql, params, cb) => {
                if (sql.includes('INSERT INTO courses')) {
                    cb.call({}, new Error('DB error'));
                } else {
                    cb.call({ lastID: 1, changes: 1 }, null);
                }
            }),
            get: jest.fn((sql, params, cb) => cb(null, null)),
        };
        const parsed = parseTeachableExport({ courses: [{ id: 1, name: 'Bad Course', sections: [] }], students: [] });
        const result = await importToDatabase(parsed, db, 'test-brand');
        expect(result.courses).toBe(0);
        expect(result.errors.some(e => e.includes('Bad Course'))).toBe(true);
    });

    test('deduplicates slug when slug already exists', async () => {
        let runCalls = 0;
        const db = {
            run: jest.fn((sql, params, cb) => {
                runCalls++;
                cb.call({ lastID: runCalls, changes: 1 }, null);
            }),
            get: jest.fn((sql, params, cb) => {
                // First call: slug exists; subsequent: no collision
                if (sql.includes('SELECT id FROM courses') && db.get.mock.calls.length === 1) {
                    cb(null, { id: 99 }); // collision!
                } else {
                    cb(null, null);
                }
            }),
        };
        const parsed = parseTeachableExport({
            courses: [{ id: 1, name: 'My Course', slug: 'my-course', sections: [] }],
            students: []
        });
        const result = await importToDatabase(parsed, db, 'test-brand');
        expect(result.courses).toBe(1);
        // The slug used in INSERT should be deduplicated (contains timestamp suffix)
        const insertCall = db.run.mock.calls.find(c => c[0].includes('INSERT INTO courses'));
        expect(insertCall[1][2]).toMatch(/^my-course-\d+$/);
    });
});
