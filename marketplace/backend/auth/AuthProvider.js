/**
 * AuthProvider - Abstract base class for authentication providers
 *
 * This abstraction allows the marketplace to support multiple authentication methods:
 * - Local (SQLite + magic links) - Default for self-hosted deployments
 * - TENEO Auth (OAuth 2.0 SSO) - Default for TENEO Cloud
 * - Future providers (Auth0, Supabase, etc.)
 *
 * All authentication providers must implement these methods.
 */

class AuthProvider {
  /**
   * Register a new user
   * @param {string} email - User's email address
   * @param {string} name - User's display name
   * @returns {Promise<{type: string, message?: string, url?: string}>}
   */
  async register(email, name) {
    throw new Error('register() must be implemented by auth provider');
  }

  /**
   * Initiate login flow
   * @param {string} email - User's email address
   * @returns {Promise<{type: string, message?: string, url?: string}>}
   */
  async login(email) {
    throw new Error('login() must be implemented by auth provider');
  }

  /**
   * Verify authentication token
   * @param {string} token - Token to verify (JWT or magic link token)
   * @returns {Promise<{id: string, email: string, name: string}>}
   */
  async verifyToken(token) {
    throw new Error('verifyToken() must be implemented by auth provider');
  }

  /**
   * Get user by ID
   * @param {string} userId - User's unique identifier
   * @returns {Promise<{id: string, email: string, name: string, credits?: number}>}
   */
  async getUser(userId) {
    throw new Error('getUser() must be implemented by auth provider');
  }

  /**
   * Get user by email
   * @param {string} email - User's email address
   * @returns {Promise<{id: string, email: string, name: string, credits?: number}>}
   */
  async getUserByEmail(email) {
    throw new Error('getUserByEmail() must be implemented by auth provider');
  }

  /**
   * Logout user (optional - for session-based auth)
   * @param {string} userId - User's unique identifier
   * @returns {Promise<void>}
   */
  async logout(userId) {
    // Optional - not all providers need this
    return;
  }

  /**
   * Handle OAuth callback (optional - only for OAuth providers)
   * @param {string} code - Authorization code
   * @returns {Promise<{id: string, email: string, name: string}>}
   */
  async handleOAuthCallback(code) {
    throw new Error('OAuth not supported by this provider');
  }

  /**
   * Get provider metadata
   * @returns {{type: string, name: string, supportsOAuth: boolean}}
   */
  getMetadata() {
    return {
      type: 'unknown',
      name: 'Unknown Provider',
      supportsOAuth: false,
    };
  }
}

module.exports = AuthProvider;
