-- Course Platform Schema

CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_cents INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT DEFAULT 'video',
    content_url TEXT,
    content_body TEXT,
    order_index INTEGER DEFAULT 0,
    is_free_preview INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id),
    user_email TEXT NOT NULL,
    order_id TEXT,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    UNIQUE(course_id, user_email)
);

CREATE TABLE IF NOT EXISTS course_progress (
    enrollment_id INTEGER REFERENCES course_enrollments(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE CASCADE,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (enrollment_id, lesson_id)
);

-- Quiz tables

CREATE TABLE IF NOT EXISTS course_quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    passing_score INTEGER DEFAULT 70,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    correct_answer TEXT NOT NULL,
    options TEXT, -- JSON array for multiple choice
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    answers TEXT, -- JSON of submitted answers
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Certificate table

CREATE TABLE IF NOT EXISTS course_certificates (
    id TEXT PRIMARY KEY, -- UUID
    course_id INTEGER NOT NULL REFERENCES courses(id),
    user_email TEXT NOT NULL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verification_url TEXT,
    UNIQUE(course_id, user_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_quizzes_course ON course_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_email ON quiz_attempts(quiz_id, user_email);
CREATE INDEX IF NOT EXISTS idx_certificates_email ON course_certificates(user_email);
