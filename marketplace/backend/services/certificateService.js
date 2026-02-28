/**
 * Certificate Service
 *
 * Handles eligibility checks and certificate generation for completed courses.
 */

const { randomUUID } = require('crypto');
const db = require('../database/database');

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

/**
 * Check whether a user is eligible to claim a certificate for a course.
 * Eligibility requires:
 *   1. All lessons in the course must be marked complete.
 *   2. All required quizzes for the course must have a passing attempt.
 *
 * @param {string} email
 * @param {number} courseId
 * @returns {{ eligible: boolean, reasons: string[] }}
 */
async function isEligible(email, courseId) {
    const reasons = [];

    // Check enrollment
    const enrollment = await dbGet(
        'SELECT * FROM course_enrollments WHERE course_id = ? AND user_email = ?',
        [courseId, email.toLowerCase()]
    );
    if (!enrollment) {
        reasons.push('Not enrolled in this course');
        return { eligible: false, reasons };
    }

    // Check all lessons completed
    const totalLessons = await dbGet(
        `SELECT COUNT(*) AS count FROM course_lessons cl
         JOIN course_modules cm ON cl.module_id = cm.id
         WHERE cm.course_id = ?`,
        [courseId]
    );
    const completedLessons = await dbGet(
        'SELECT COUNT(*) AS count FROM course_progress WHERE enrollment_id = ?',
        [enrollment.id]
    );
    if (completedLessons.count < totalLessons.count) {
        reasons.push(`${completedLessons.count}/${totalLessons.count} lessons completed`);
    }

    // Check required quizzes passed
    const quizzes = await dbAll('SELECT id, title, passing_score FROM course_quizzes WHERE course_id = ?', [courseId]);
    for (const quiz of quizzes) {
        const passed = await dbGet(
            'SELECT id FROM quiz_attempts WHERE quiz_id = ? AND user_email = ? AND passed = 1',
            [quiz.id, email.toLowerCase()]
        );
        if (!passed) {
            reasons.push(`Quiz "${quiz.title}" not yet passed`);
        }
    }

    return { eligible: reasons.length === 0, reasons };
}

/**
 * Generate and persist a certificate record.
 *
 * @param {string} email
 * @param {number} courseId
 * @param {string} courseName
 * @param {string} userName  Display name for the certificate
 * @param {string} baseUrl   Origin used to build the verification URL
 * @returns {{ certId: string, verificationUrl: string, html: string }}
 */
async function generateCertificate(email, courseId, courseName, userName, baseUrl) {
    const certId = randomUUID();
    const verificationUrl = `${baseUrl}/api/verify/certificate/${certId}`; // public canonical URL
    const issuedAt = new Date().toISOString();

    await dbRun(
        `INSERT INTO course_certificates (id, course_id, user_email, issued_at, verification_url)
         VALUES (?, ?, ?, ?, ?)`,
        [certId, courseId, email.toLowerCase(), issuedAt, verificationUrl]
    );

    const html = buildCertificateHtml({ certId, courseName, userName, issuedAt, verificationUrl });

    return { certId, verificationUrl, html };
}

/**
 * Fetch certificate details by ID.
 *
 * @param {string} certId
 * @returns {object|null}
 */
async function getCertificate(certId) {
    const cert = await dbGet(
        `SELECT cc.id, cc.course_id, cc.user_email, cc.issued_at, cc.verification_url,
                c.title AS course_title
         FROM course_certificates cc
         JOIN courses c ON cc.course_id = c.id
         WHERE cc.id = ?`,
        [certId]
    );
    return cert || null;
}

/**
 * Build a printable HTML certificate page.
 */
function buildCertificateHtml({ certId, courseName, userName, issuedAt, verificationUrl }) {
    const date = new Date(issuedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificate of Completion — ${escapeHtml(courseName)}</title>
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
  <div class="recipient">${escapeHtml(userName)}</div>
  <div class="body-text">has successfully completed the course</div>
  <div class="course-name">${escapeHtml(courseName)}</div>
  <div class="date">Issued on ${escapeHtml(date)}</div>
  <div class="divider"></div>
  <div class="verify">Verify at: ${escapeHtml(verificationUrl)}</div>
  <div class="cert-id">Certificate ID: ${escapeHtml(certId)}</div>
</div>
</body>
</html>`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = { isEligible, generateCertificate, getCertificate };
