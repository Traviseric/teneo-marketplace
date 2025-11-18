/**
 * Authentication Configuration
 *
 * Selects and configures the authentication provider based on environment variables.
 *
 * Supported providers:
 * - 'local' (default) - SQLite + magic links for self-hosted deployments
 * - 'teneo-auth' - TENEO Auth SSO for TENEO Cloud deployment
 */

const TeneoAuthProvider = require('./providers/TeneoAuthProvider');
const LocalAuthProvider = require('./providers/LocalAuthProvider');

/**
 * Get configured authentication provider
 * @returns {AuthProvider} Configured auth provider instance
 */
function getAuthProvider() {
  const providerType = process.env.AUTH_PROVIDER || 'local';

  console.log(`[Auth] Initializing ${providerType} authentication provider`);

  switch (providerType.toLowerCase()) {
    case 'teneo-auth': {
      // TENEO Auth SSO (OAuth 2.0)
      const config = {
        authUrl: process.env.TENEO_AUTH_URL || 'https://auth.teneo.io',
        clientId: process.env.TENEO_CLIENT_ID,
        clientSecret: process.env.TENEO_CLIENT_SECRET,
        callbackUrl: process.env.TENEO_CALLBACK_URL,
        serviceKey: process.env.TENEO_SERVICE_KEY,
      };

      // Validate required OAuth credentials
      if (!config.clientId || !config.clientSecret || !config.callbackUrl) {
        console.error('[Auth] Missing required TENEO Auth credentials');
        console.error('Required environment variables:');
        console.error('  - TENEO_CLIENT_ID');
        console.error('  - TENEO_CLIENT_SECRET');
        console.error('  - TENEO_CALLBACK_URL');
        console.error('Falling back to local auth provider');
        return new LocalAuthProvider();
      }

      try {
        return new TeneoAuthProvider(config);
      } catch (error) {
        console.error('[Auth] Failed to initialize TENEO Auth provider:', error.message);
        console.error('Falling back to local auth provider');
        return new LocalAuthProvider();
      }
    }

    case 'local':
    default: {
      // Local auth (SQLite + magic links)
      const config = {
        linkExpiryMinutes: parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES || '60'),
      };

      return new LocalAuthProvider(config);
    }
  }
}

/**
 * Get authentication provider metadata (for frontend)
 * @returns {{type: string, name: string, supportsOAuth: boolean}}
 */
function getAuthConfig() {
  const provider = getAuthProvider();
  return provider.getMetadata();
}

/**
 * Singleton instance
 */
let authProviderInstance = null;

/**
 * Get singleton auth provider instance
 * @returns {AuthProvider}
 */
function getAuthProviderInstance() {
  if (!authProviderInstance) {
    authProviderInstance = getAuthProvider();
    console.log('[Auth] Provider initialized:', authProviderInstance.getMetadata());
  }
  return authProviderInstance;
}

module.exports = {
  getAuthProvider,
  getAuthConfig,
  getAuthProviderInstance,
};
