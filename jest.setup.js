/**
 * Jest global setup — runs before every test file.
 * Sets environment variables so server.js skips slow bcrypt hash generation
 * and CSRF protection is disabled in test mode.
 */
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only-not-production';
// Provide a pre-set hash so validateEnvironment() skips bcrypt.hashSync (cost=10 is slow)
process.env.ADMIN_PASSWORD_HASH = '$2b$10$placeholder.hash.for.test.env.only.not.real';
// Use local (magic-link) auth provider — avoids needing OAuth credentials
process.env.AUTH_PROVIDER = 'local';
