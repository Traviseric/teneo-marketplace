/**
 * Teachable Import Service
 * Parses a Teachable school export JSON and imports courses, modules, lessons, and students.
 *
 * Teachable school export structure (Settings → Export):
 * {
 *   "courses": [{
 *     "id": 123,
 *     "name": "Course Name",
 *     "heading": "Subtitle",
 *     "description": "<p>...</p>",
 *     "price": "99.0",
 *     "is_published": true,
 *     "slug": "course-slug",
 *     "sections": [{
 *       "id": 456,
 *       "name": "Section Title",
 *       "lectures": [{
 *         "id": 789,
 *         "name": "Lecture Title",
 *         "lecture_type": "video",
 *         "media_url": "https://...",
 *         "body": "<p>...</p>",
 *         "is_published": true,
 *         "free_preview": false
 *       }]
 *     }]
 *   }],
 *   "students": [{
 *     "email": "student@example.com",
 *     "name": "Student Name",
 *     "enrolled_courses": [123]
 *   }]
 * }
 */

const crypto = require('crypto');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Parse and validate a Teachable school export JSON string.
 * Returns a structured object describing courses, modules, lessons, and students.
 *
 * @param {string|object} input - raw JSON string or already-parsed object
 * @returns {{ courses: object[], students: object[], errors: string[] }}
 */
function parseTeachableExport(input) {
    let data;
    if (typeof input === 'string') {
        try {
            data = JSON.parse(input);
        } catch (e) {
            throw new Error('Invalid JSON: ' + e.message);
        }
    } else {
        data = input;
    }

    if (!data || typeof data !== 'object') {
        throw new Error('Export must be a JSON object');
    }

    // Support top-level courses array OR wrapped in a school object
    const rawCourses = Array.isArray(data.courses)
        ? data.courses
        : Array.isArray(data.school?.courses)
            ? data.school.courses
            : [];

    const rawStudents = Array.isArray(data.students)
        ? data.students
        : Array.isArray(data.users)
            ? data.users
            : [];

    const errors = [];
    const courses = [];

    for (let ci = 0; ci < rawCourses.length; ci++) {
        const c = rawCourses[ci];
        const courseName = (c.name || c.title || '').trim();
        if (!courseName) {
            errors.push(`Course[${ci}]: missing name — skipped`);
            continue;
        }

        const baseSlug = slugify(courseName);
        const slug = c.slug ? slugify(c.slug) : baseSlug;

        const priceCents = parsePriceCents(c.price);

        const modules = [];
        const rawSections = Array.isArray(c.sections) ? c.sections : [];

        for (let si = 0; si < rawSections.length; si++) {
            const s = rawSections[si];
            const sectionName = (s.name || s.title || `Section ${si + 1}`).trim();

            const lessons = [];
            const rawLectures = Array.isArray(s.lectures) ? s.lectures : [];

            for (let li = 0; li < rawLectures.length; li++) {
                const l = rawLectures[li];
                const lectureTitle = (l.name || l.title || `Lecture ${li + 1}`).trim();

                const contentType = mapLectureType(l.lecture_type || l.type || 'text');
                const contentUrl = (l.media_url || l.url || l.video_url || '').trim();
                const contentBody = (l.body || l.text || '').trim();
                const isFreePreview = l.free_preview === true || l.is_free_preview === true ? 1 : 0;
                const isPublished = l.is_published !== false ? 1 : 0;

                lessons.push({
                    title: lectureTitle,
                    content_type: contentType,
                    content_url: contentUrl,
                    content_body: contentBody,
                    order_index: li,
                    is_free_preview: isFreePreview,
                    is_published: isPublished,
                    teachable_lecture_id: l.id || null,
                });
            }

            modules.push({
                title: sectionName,
                order_index: si,
                lessons,
                teachable_section_id: s.id || null,
            });
        }

        courses.push({
            slug,
            title: courseName,
            description: (c.description || c.heading || '').trim(),
            price_cents: priceCents,
            is_published: c.is_published !== false ? 1 : 0,
            modules,
            teachable_course_id: c.id || null,
        });
    }

    // Parse students
    const students = [];
    for (let ui = 0; ui < rawStudents.length; ui++) {
        const u = rawStudents[ui];
        const email = (u.email || '').trim().toLowerCase();
        if (!email) {
            errors.push(`Student[${ui}]: missing email — skipped`);
            continue;
        }
        if (!isValidEmail(email)) {
            errors.push(`Student[${ui}]: invalid email "${email}" — skipped`);
            continue;
        }

        const enrolledCourseIds = Array.isArray(u.enrolled_courses) ? u.enrolled_courses : [];
        students.push({
            email,
            name: (u.name || u.full_name || '').trim() || null,
            enrolled_course_ids: enrolledCourseIds,
        });
    }

    return { courses, students, errors };
}

function parsePriceCents(raw) {
    if (raw === null || raw === undefined || raw === '') return 0;
    const str = String(raw).replace(/[^0-9.]/g, '');
    const dollars = parseFloat(str);
    if (isNaN(dollars)) return 0;
    return Math.round(dollars * 100);
}

function mapLectureType(type) {
    const t = String(type).toLowerCase();
    if (t === 'video') return 'video';
    if (t === 'audio') return 'audio';
    if (t === 'pdf' || t === 'file') return 'pdf';
    if (t === 'quiz') return 'quiz';
    return 'text';
}

// ─── DB Import ────────────────────────────────────────────────────────────────

function dbRun(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err); else resolve(this);
        });
    });
}

function dbGet(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

/**
 * Import a parsed Teachable export into the database.
 *
 * @param {object} parsed - result from parseTeachableExport()
 * @param {object} db     - sqlite3 db instance
 * @param {string} brandId
 * @returns {Promise<{ courses: number, modules: number, lessons: number, students: number, enrollments: number, errors: string[] }>}
 */
async function importToDatabase(parsed, db, brandId) {
    const { courses, students, errors } = parsed;
    const importErrors = [...errors];

    let coursesInserted = 0;
    let modulesInserted = 0;
    let lessonsInserted = 0;
    let studentsInserted = 0;
    let enrollmentsInserted = 0;

    // Map from Teachable course ID → our DB course ID (for enrollment mapping)
    const teachableIdToDbId = {};
    // Map from Teachable course ID → slug (for enrollment lookup fallback)
    const teachableIdToSlug = {};

    // ── Insert Courses ──
    for (const course of courses) {
        try {
            // Deduplicate slugs
            let slug = course.slug;
            const existing = await dbGet(db, 'SELECT id FROM courses WHERE slug = ?', [slug]);
            if (existing) {
                slug = `${slug}-${Date.now()}`;
            }

            const result = await dbRun(
                db,
                'INSERT INTO courses (brand_id, title, slug, description, price_cents, is_published) VALUES (?, ?, ?, ?, ?, ?)',
                [brandId, course.title, slug, course.description, course.price_cents, course.is_published]
            );
            const courseDbId = result.lastID;

            if (course.teachable_course_id) {
                teachableIdToDbId[course.teachable_course_id] = courseDbId;
                teachableIdToSlug[course.teachable_course_id] = slug;
            }
            coursesInserted++;

            // ── Insert Modules ──
            for (const mod of course.modules) {
                try {
                    const modResult = await dbRun(
                        db,
                        'INSERT INTO course_modules (course_id, title, order_index) VALUES (?, ?, ?)',
                        [courseDbId, mod.title, mod.order_index]
                    );
                    const moduleDbId = modResult.lastID;
                    modulesInserted++;

                    // ── Insert Lessons ──
                    for (const lesson of mod.lessons) {
                        try {
                            await dbRun(
                                db,
                                `INSERT INTO course_lessons
                                 (module_id, title, content_type, content_url, content_body, order_index, is_free_preview)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [moduleDbId, lesson.title, lesson.content_type, lesson.content_url,
                                    lesson.content_body, lesson.order_index, lesson.is_free_preview]
                            );
                            lessonsInserted++;
                        } catch (lessonErr) {
                            importErrors.push(`Lesson "${lesson.title}": ${lessonErr.message}`);
                        }
                    }
                } catch (modErr) {
                    importErrors.push(`Module "${mod.title}": ${modErr.message}`);
                }
            }
        } catch (courseErr) {
            importErrors.push(`Course "${course.title}": ${courseErr.message}`);
        }
    }

    // ── Insert Students + Enrollments ──
    for (const student of students) {
        const unsubToken = crypto.randomBytes(32).toString('hex');
        try {
            await dbRun(
                db,
                `INSERT OR IGNORE INTO subscribers
                 (email, name, source, status, confirmed, unsubscribe_token)
                 VALUES (?, ?, 'teachable_import', 'active', 1, ?)`,
                [student.email, student.name, unsubToken]
            );
            studentsInserted++;
        } catch (subErr) {
            importErrors.push(`Student "${student.email}": ${subErr.message}`);
        }

        // Enroll in courses
        for (const teachableCourseId of student.enrolled_course_ids) {
            const dbCourseId = teachableIdToDbId[teachableCourseId];
            if (!dbCourseId) continue;

            try {
                await dbRun(
                    db,
                    `INSERT OR IGNORE INTO course_enrollments
                     (course_id, user_email, order_id)
                     VALUES (?, ?, 'teachable_import')`,
                    [dbCourseId, student.email]
                );
                enrollmentsInserted++;
            } catch (enrollErr) {
                importErrors.push(`Enrollment ${student.email} → course ${teachableCourseId}: ${enrollErr.message}`);
            }
        }
    }

    return {
        courses: coursesInserted,
        modules: modulesInserted,
        lessons: lessonsInserted,
        students: studentsInserted,
        enrollments: enrollmentsInserted,
        errors: importErrors,
    };
}

module.exports = {
    parseTeachableExport,
    importToDatabase,
};
