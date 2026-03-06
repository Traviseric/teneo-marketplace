/**
 * LocalAuthProvider - SQLite + Magic Links Authentication
 *
 * Provides standalone authentication for self-hosted deployments.
 * Uses magic link emails instead of passwords for better security.
 *
 * Features:
 * - Passwordless authentication via email magic links
 * - SQLite storage (no external dependencies)
 * - Works completely offline
 * - No API keys or external services required
 */

const AuthProvider = require('../AuthProvider');
const crypto = require('crypto');
const db = require('../../database/db');
const emailService = require('../../services/emailService');

const dbGet = async (sql, params = []) => {
  if (typeof db.get === 'function') {
    return db.get(sql, params);
  }
  if (typeof db.prepare === 'function') {
    return db.prepare(sql).get(...params);
  }
  throw new Error('Database adapter does not implement get/prepare');
};

const dbRun = async (sql, params = []) => {
  if (typeof db.run === 'function') {
    return db.run(sql, params);
  }
  if (typeof db.prepare === 'function') {
    return db.prepare(sql).run(...params);
  }
  throw new Error('Database adapter does not implement run/prepare');
};

class LocalAuthProvider extends AuthProvider {
  constructor(config = {}) {
    super();
    this.config = {
      linkExpiryMinutes: config.linkExpiryMinutes || 60, // 1 hour
      ...config,
    };
  }

  /**
   * Register a new user with magic link
   */
  async register(email, name) {
    try {
      // Normalize email
      email = email.toLowerCase().trim();

      // Check if user already exists
      const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);

      if (existing) {
        throw new Error('User with this email already exists');
      }

      // Create user
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      await dbRun(
        `INSERT INTO users (
          id, email, name, auth_provider, email_verified,
          signup_source, created_at, updated_at
        ) VALUES (?, ?, ?, 'local', 0, 'web', ?, ?)`,
        [userId, email, name, now, now]
      );

      // Generate magic link
      const token = await this._createMagicLink(userId);

      // Send magic link email
      await emailService.sendMagicLink(email, name, token);

      // Log audit event
      this._logAudit(userId, 'register', true, {
        email,
        provider: 'local',
      });

      return {
        type: 'magic_link',
        message: 'Registration successful! Check your email for the login link.',
      };
    } catch (error) {
      // Log failed attempt
      this._logAudit(null, 'register', false, {
        error: error.message,
        email,
      });

      throw error;
    }
  }

  /**
   * Initiate login flow with magic link
   */
  async login(email) {
    try {
      // Normalize email
      email = email.toLowerCase().trim();

      // Check if user exists
      const user = await dbGet(
        'SELECT id, name, account_status FROM users WHERE email = ? AND auth_provider = ?',
        [email, 'local']
      );

      if (!user) {
        // Don't reveal if user exists - send generic message
        return {
          type: 'magic_link',
          message: 'If an account exists with this email, you will receive a login link.',
        };
      }

      // Check account status
      if (user.account_status !== 'active') {
        throw new Error('Account is suspended or deleted');
      }

      // Generate magic link
      const token = await this._createMagicLink(user.id);

      // Send magic link email
      await emailService.sendMagicLink(email, user.name, token);

      // Update last login attempt
      await dbRun('UPDATE users SET updated_at = ? WHERE id = ?', [new Date().toISOString(), user.id]);

      // Log audit event
      this._logAudit(user.id, 'login_attempt', true, { email });

      return {
        type: 'magic_link',
        message: 'Check your email for the login link.',
      };
    } catch (error) {
      this._logAudit(null, 'login_attempt', false, {
        error: error.message,
        email,
      });

      throw error;
    }
  }

  /**
   * Verify magic link token and return user
   */
  async verifyToken(token) {
    try {
      // Look up magic link
      const link = await dbGet(
        `SELECT ml.*, u.*
         FROM magic_links ml
         JOIN users u ON ml.user_id = u.id
         WHERE ml.token = ?
           AND ml.used = 0
           AND ml.expires_at > datetime('now')
           AND u.account_status = 'active'`,
        [token]
      );

      if (!link) {
        throw new Error('Invalid or expired login link');
      }

      // Mark magic link as used
      await dbRun('UPDATE magic_links SET used = 1, used_at = datetime("now") WHERE token = ?', [token]);

      // Update last login time
      await dbRun('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), link.user_id]);

      // Log successful login
      this._logAudit(link.user_id, 'login', true, {
        email: link.email,
        via: 'magic_link',
      });

      // Return user data
      return {
        id: link.user_id,
        email: link.email,
        name: link.name,
        avatar_url: link.avatar_url,
        credits: link.credits,
        email_verified: link.email_verified === 1,
      };
    } catch (error) {
      this._logAudit(null, 'login', false, {
        error: error.message,
        token: token.substring(0, 10) + '...',
      });

      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    const user = await dbGet(
      `SELECT id, email, name, avatar_url, bio, credits,
              email_verified, account_status, created_at, last_login
       FROM users
       WHERE id = ? AND auth_provider = 'local'`,
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      credits: user.credits,
      email_verified: user.email_verified === 1,
      account_status: user.account_status,
      created_at: user.created_at,
      last_login: user.last_login,
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    email = email.toLowerCase().trim();

    const user = await dbGet(
      `SELECT id, email, name, avatar_url, bio, credits,
              email_verified, account_status, created_at, last_login
       FROM users
       WHERE email = ? AND auth_provider = 'local'`,
      [email]
    );

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      credits: user.credits,
      email_verified: user.email_verified === 1,
      account_status: user.account_status,
      created_at: user.created_at,
      last_login: user.last_login,
    };
  }

  /**
   * Logout (cleanup sessions if needed)
   */
  async logout(userId) {
    // Log logout event
    this._logAudit(userId, 'logout', true, {});

    // Clean up expired magic links for this user
    await dbRun(
      `DELETE FROM magic_links
       WHERE user_id = ?
         AND (used = 1 OR expires_at < datetime('now'))`,
      [userId]
    );

    return;
  }

  /**
   * Get provider metadata
   */
  getMetadata() {
    return {
      type: 'local',
      name: 'Local Magic Link Authentication',
      supportsOAuth: false,
      description: 'Passwordless authentication using email magic links',
    };
  }

  // =====================================
  // Private Helper Methods
  // =====================================

  /**
   * Create a magic link token
   */
  async _createMagicLink(userId) {
    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry time
    const expiryMinutes = this.config.linkExpiryMinutes;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)
      .toISOString();

    // Store in database
    await dbRun(
      `INSERT INTO magic_links (token, user_id, expires_at, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [token, userId, expiresAt]
    );

    return token;
  }

  /**
   * Log authentication audit event
   */
  _logAudit(userId, eventType, success, metadata = {}) {
    dbRun(
      `INSERT INTO auth_audit_log (
        user_id, event_type, auth_provider, success,
        failure_reason, metadata, created_at
      ) VALUES (?, ?, 'local', ?, ?, ?, datetime('now'))`,
      [
        userId,
        eventType,
        success ? 1 : 0,
        success ? null : metadata.error,
        JSON.stringify(metadata),
      ]
    ).catch((error) => {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging failures shouldn't break auth
    });
  }

  /**
   * Clean up expired magic links (call periodically)
   */
  static async cleanupExpiredLinks() {
    try {
      const result = await dbRun(
        `DELETE FROM magic_links
         WHERE expires_at < datetime('now')
           AND used = 1`
      );

      console.log(`Cleaned up ${result.changes} expired magic links`);
      return result.changes || 0;
    } catch (error) {
      console.error('Failed to cleanup expired links:', error);
      return 0;
    }
  }
}

module.exports = LocalAuthProvider;
