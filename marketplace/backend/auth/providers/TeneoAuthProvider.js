/**
 * TeneoAuthProvider - TENEO Auth SSO Integration (OAuth 2.0)
 *
 * Integrates with TENEO Auth platform for unified authentication across
 * the TENEO ecosystem (BCG, AIBridge, FormForge, marketplace, etc.)
 *
 * Features:
 * - OAuth 2.0 with PKCE for secure authentication
 * - Unified user accounts across all TENEO services
 * - Unified credit system (buy anywhere, use everywhere)
 * - Single Sign-On (SSO) experience
 * - Enterprise-grade security
 *
 * How it works:
 * 1. User clicks "Login with TENEO"
 * 2. Redirects to auth.teneo.io OAuth authorize endpoint
 * 3. User logs in (or registers) on TENEO Auth
 * 4. Redirects back with authorization code
 * 5. Exchange code for access token
 * 6. Use token to get user info and verify identity
 * 7. Create local session linked to TENEO user
 */

const AuthProvider = require('../AuthProvider');
const crypto = require('crypto');
const db = require('../../database/db');

class TeneoAuthProvider extends AuthProvider {
  constructor(config) {
    super();

    // Validate required config
    if (!config.authUrl) throw new Error('TENEO_AUTH_URL is required');
    if (!config.clientId) throw new Error('TENEO_CLIENT_ID is required');
    if (!config.clientSecret) throw new Error('TENEO_CLIENT_SECRET is required');
    if (!config.callbackUrl) throw new Error('TENEO_CALLBACK_URL is required');

    this.authUrl = config.authUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.callbackUrl = config.callbackUrl;
    this.serviceKey = config.serviceKey; // For server-to-server API calls
  }

  /**
   * Register - redirect to TENEO Auth
   */
  async register(email, name) {
    // For OAuth, registration happens on TENEO Auth
    // Redirect to auth platform with pre-filled email
    const state = this._generateState();
    const codeVerifier = this._generateCodeVerifier();
    const codeChallenge = await this._generateCodeChallenge(codeVerifier);

    // Store PKCE values in session (caller will handle this)
    const authUrl = `${this.authUrl}/api/oauth/authorize?` +
      `client_id=${encodeURIComponent(this.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.callbackUrl)}` +
      `&response_type=code` +
      `&state=${state}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256` +
      `&email=${encodeURIComponent(email)}` +
      `&name=${encodeURIComponent(name)}` +
      `&mode=register`;

    return {
      type: 'redirect',
      url: authUrl,
      state,
      codeVerifier, // Caller must store this in session
    };
  }

  /**
   * Login - redirect to TENEO Auth
   */
  async login(email) {
    // OAuth 2.0 authorization flow
    const state = this._generateState();
    const codeVerifier = this._generateCodeVerifier();
    const codeChallenge = await this._generateCodeChallenge(codeVerifier);

    const authUrl = `${this.authUrl}/api/oauth/authorize?` +
      `client_id=${encodeURIComponent(this.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.callbackUrl)}` +
      `&response_type=code` +
      `&state=${state}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256` +
      (email ? `&email=${encodeURIComponent(email)}` : '');

    return {
      type: 'redirect',
      url: authUrl,
      state,
      codeVerifier, // Caller must store this in session
    };
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  async handleOAuthCallback(code, codeVerifier) {
    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch(`${this.authUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.callbackUrl,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error_description || 'Token exchange failed');
      }

      const tokens = await tokenResponse.json();

      // Get user info from TENEO Auth
      const user = await this._fetchUserInfo(tokens.access_token);

      // Store or update user in local database
      await this._syncUser(user, tokens);

      // Log successful login
      this._logAudit(user.localUserId, 'login', true, {
        email: user.email,
        via: 'oauth_teneo_auth',
        teneoUserId: user.id,
      });

      return {
        id: user.localUserId, // Local marketplace user ID
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        credits: user.credits, // From TENEO Auth unified credits
        email_verified: user.email_verified,
        teneoUserId: user.id, // TENEO Auth user ID
      };
    } catch (error) {
      this._logAudit(null, 'login', false, {
        error: error.message,
        via: 'oauth_callback',
      });

      throw error;
    }
  }

  /**
   * Verify JWT token from TENEO Auth
   */
  async verifyToken(token) {
    try {
      // Verify token with TENEO Auth
      const response = await fetch(`${this.authUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const { user } = await response.json();

      // Get or create local user record
      let localUser = db
        .prepare('SELECT * FROM users WHERE teneo_user_id = ?')
        .get(user.id);

      if (!localUser) {
        // Create local user record on first token verification
        localUser = await this._createLocalUser(user);
      }

      return {
        id: localUser.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        credits: user.credits, // From TENEO Auth
        email_verified: user.email_verified,
        teneoUserId: user.id,
      };
    } catch (error) {
      throw new Error('Token verification failed: ' + error.message);
    }
  }

  /**
   * Get user by local ID
   */
  async getUser(userId) {
    const user = db
      .prepare(
        `SELECT u.*, ot.access_token
         FROM users u
         LEFT JOIN oauth_tokens ot ON u.id = ot.user_id AND ot.provider = 'teneo-auth'
         WHERE u.id = ? AND u.auth_provider = 'teneo-auth'`
      )
      .get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Fetch fresh data from TENEO Auth (including current credits)
    if (user.access_token) {
      try {
        const freshData = await this._fetchUserInfo(user.access_token);
        return {
          id: user.id,
          email: freshData.email,
          name: freshData.name,
          avatar_url: freshData.avatar_url,
          credits: freshData.credits, // Always fresh from TENEO Auth
          email_verified: freshData.email_verified,
          teneoUserId: user.teneo_user_id,
        };
      } catch (error) {
        // Fallback to local cached data if TENEO Auth is unreachable
        console.warn('Failed to fetch fresh user data, using cached:', error);
      }
    }

    // Return cached local data
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      credits: user.credits,
      email_verified: user.email_verified === 1,
      teneoUserId: user.teneo_user_id,
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    email = email.toLowerCase().trim();

    const user = db
      .prepare(
        `SELECT u.*, ot.access_token
         FROM users u
         LEFT JOIN oauth_tokens ot ON u.id = ot.user_id AND ot.provider = 'teneo-auth'
         WHERE u.email = ? AND u.auth_provider = 'teneo-auth'`
      )
      .get(email);

    if (!user) {
      throw new Error('User not found');
    }

    // Fetch fresh data if possible
    if (user.access_token) {
      try {
        const freshData = await this._fetchUserInfo(user.access_token);
        return {
          id: user.id,
          email: freshData.email,
          name: freshData.name,
          avatar_url: freshData.avatar_url,
          credits: freshData.credits,
          email_verified: freshData.email_verified,
          teneoUserId: user.teneo_user_id,
        };
      } catch (error) {
        console.warn('Failed to fetch fresh user data:', error);
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      credits: user.credits,
      email_verified: user.email_verified === 1,
      teneoUserId: user.teneo_user_id,
    };
  }

  /**
   * Logout
   */
  async logout(userId) {
    // Log logout event
    this._logAudit(userId, 'logout', true, {});

    // OAuth tokens remain valid on TENEO Auth
    // Local session cleanup happens in session middleware
    return;
  }

  /**
   * Get provider metadata
   */
  getMetadata() {
    return {
      type: 'teneo-auth',
      name: 'TENEO Auth SSO',
      supportsOAuth: true,
      description: 'Unified authentication for the TENEO ecosystem',
      features: [
        'Single Sign-On (SSO)',
        'Unified credits across TENEO services',
        'OAuth 2.0 with PKCE',
        'Enterprise security',
      ],
    };
  }

  // =====================================
  // Private Helper Methods
  // =====================================

  /**
   * Fetch user info from TENEO Auth
   */
  async _fetchUserInfo(accessToken) {
    const response = await fetch(`${this.authUrl}/api/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return await response.json();
  }

  /**
   * Sync TENEO Auth user to local database
   */
  async _syncUser(teneoUser, tokens) {
    const now = new Date().toISOString();

    // Check if user exists
    let localUser = db
      .prepare('SELECT id FROM users WHERE teneo_user_id = ?')
      .get(teneoUser.id);

    if (localUser) {
      // Update existing user
      db.prepare(
        `UPDATE users SET
          email = ?, name = ?, avatar_url = ?,
          credits = ?, email_verified = ?,
          last_login = ?, updated_at = ?
         WHERE teneo_user_id = ?`
      ).run(
        teneoUser.email,
        teneoUser.name,
        teneoUser.avatar_url,
        teneoUser.credits,
        teneoUser.email_verified ? 1 : 0,
        now,
        now,
        teneoUser.id
      );
    } else {
      // Create new user
      const localUserId = crypto.randomUUID();

      db.prepare(
        `INSERT INTO users (
          id, email, name, avatar_url, auth_provider, teneo_user_id,
          credits, email_verified, signup_source, created_at, updated_at, last_login
        ) VALUES (?, ?, ?, ?, 'teneo-auth', ?, ?, ?, 'oauth', ?, ?, ?)`
      ).run(
        localUserId,
        teneoUser.email,
        teneoUser.name,
        teneoUser.avatar_url,
        teneoUser.id,
        teneoUser.credits,
        teneoUser.email_verified ? 1 : 0,
        now,
        now,
        now
      );

      localUser = { id: localUserId };
    }

    // Store OAuth tokens
    db.prepare(
      `INSERT OR REPLACE INTO oauth_tokens (
        user_id, access_token, refresh_token, token_type,
        expires_at, provider, provider_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'teneo-auth', ?, ?, ?)`
    ).run(
      localUser.id,
      tokens.access_token,
      tokens.refresh_token,
      'Bearer',
      tokens.expires_at || new Date(Date.now() + 3600000).toISOString(), // 1 hour default
      teneoUser.id,
      now,
      now
    );

    teneoUser.localUserId = localUser.id;
    return teneoUser;
  }

  /**
   * Create local user from TENEO Auth data
   */
  async _createLocalUser(teneoUser) {
    const localUserId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (
        id, email, name, avatar_url, auth_provider, teneo_user_id,
        credits, email_verified, signup_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'teneo-auth', ?, ?, ?, 'oauth', ?, ?)`
    ).run(
      localUserId,
      teneoUser.email,
      teneoUser.name,
      teneoUser.avatar_url,
      teneoUser.id,
      teneoUser.credits,
      teneoUser.email_verified ? 1 : 0,
      now,
      now
    );

    return {
      id: localUserId,
      email: teneoUser.email,
      name: teneoUser.name,
      teneo_user_id: teneoUser.id,
    };
  }

  /**
   * Generate random state for CSRF protection
   */
  _generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate PKCE code verifier
   */
  _generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  async _generateCodeChallenge(verifier) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }

  /**
   * Log authentication audit event
   */
  _logAudit(userId, eventType, success, metadata = {}) {
    try {
      db.prepare(
        `INSERT INTO auth_audit_log (
          user_id, event_type, auth_provider, success,
          failure_reason, metadata, created_at
        ) VALUES (?, ?, 'teneo-auth', ?, ?, ?, datetime('now'))`
      ).run(
        userId,
        eventType,
        success ? 1 : 0,
        success ? null : metadata.error,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}

module.exports = TeneoAuthProvider;
