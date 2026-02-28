/**
 * Authentication Routes
 *
 * Handles user authentication for the marketplace using pluggable auth providers.
 * Supports both local auth (magic links) and TENEO Auth (OAuth 2.0 SSO).
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getAuthProviderInstance, getAuthConfig } = require('../auth/config');
const { isValidEmail, safeMessage } = require('../utils/validate');

// Rate limiter for magic-link / login / register — 5 attempts per 15 min per IP (CWE-307)
// Disabled in test environment to allow test suites to run freely
const magicLinkLimiter = process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: { success: false, error: 'Too many auth requests. Please wait 15 minutes.' },
        standardHeaders: true,
        legacyHeaders: false,
    });

// =====================================
// Public Routes (No Auth Required)
// =====================================

/**
 * GET /api/auth/config
 * Returns auth provider metadata for frontend
 */
router.get('/config', (req, res) => {
  try {
    const config = getAuthConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get auth config' });
  }
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', magicLinkLimiter, async (req, res) => {
  try {
    const { email, name } = req.body;

    // Validate input
    if (!email || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and name are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    const authProvider = getAuthProviderInstance();
    const result = await authProvider.register(email, name);

    if (result.type === 'redirect') {
      // OAuth flow - store PKCE verifier in session
      req.session.oauthState = result.state;
      req.session.codeVerifier = result.codeVerifier;

      res.json({
        type: 'redirect',
        url: result.url,
      });
    } else {
      // Magic link flow
      res.json({
        type: 'magic_link',
        message: result.message,
      });
    }
  } catch (error) {
    console.error('[Auth] Registration error:', error);

    res.status(400).json({
      error: 'Registration failed',
      message: safeMessage(error),
    });
  }
});

/**
 * POST /api/auth/login
 * Initiate login flow
 */
router.post('/login', magicLinkLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'A valid email address is required',
      });
    }

    const authProvider = getAuthProviderInstance();
    const result = await authProvider.login(email);

    if (result.type === 'redirect') {
      // OAuth flow - store PKCE verifier in session
      req.session.oauthState = result.state;
      req.session.codeVerifier = result.codeVerifier;

      res.json({
        type: 'redirect',
        url: result.url,
      });
    } else {
      // Magic link flow
      res.json({
        type: 'magic_link',
        message: result.message,
      });
    }
  } catch (error) {
    console.error('[Auth] Login error:', error);

    res.status(400).json({
      error: 'Login failed',
      message: safeMessage(error),
    });
  }
});

/**
 * GET /api/auth/callback
 * OAuth callback endpoint (for TENEO Auth)
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Verify state for CSRF protection
    if (!req.session.oauthState || req.session.oauthState !== state) {
      return res.status(400).json({
        error: 'Invalid state',
        message: 'CSRF validation failed',
      });
    }

    // Get code verifier from session
    const codeVerifier = req.session.codeVerifier;
    if (!codeVerifier) {
      return res.status(400).json({
        error: 'Missing code verifier',
        message: 'Session expired. Please try logging in again.',
      });
    }

    const authProvider = getAuthProviderInstance();

    // Handle OAuth callback (only TENEO Auth supports this)
    if (!authProvider.handleOAuthCallback) {
      return res.status(400).json({
        error: 'OAuth not supported',
        message: 'Current auth provider does not support OAuth',
      });
    }

    const user = await authProvider.handleOAuthCallback(code, codeVerifier);

    // Create session
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.name = user.name;
    req.session.isAuthenticated = true;

    // Clean up OAuth session data
    delete req.session.oauthState;
    delete req.session.codeVerifier;

    // Redirect to dashboard or home
    res.redirect('/dashboard');
  } catch (error) {
    console.error('[Auth] OAuth callback error:', error);

    res.redirect('/login?error=auth_failed&message=' + encodeURIComponent(error.message));
  }
});

/**
 * GET /api/auth/verify-magic-link
 * Verify magic link token (for local auth)
 */
router.get('/verify-magic-link', magicLinkLimiter, async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect('/login?error=missing_token');
    }

    const authProvider = getAuthProviderInstance();
    const user = await authProvider.verifyToken(token);

    // Create session
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.name = user.name;
    req.session.isAuthenticated = true;

    // Redirect to dashboard or home
    res.redirect('/dashboard');
  } catch (error) {
    console.error('[Auth] Magic link verification error:', error);

    res.redirect('/login?error=invalid_link&message=' + encodeURIComponent(error.message));
  }
});

/**
 * POST /api/auth/verify
 * Verify JWT token (for API access)
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Token is required',
      });
    }

    const authProvider = getAuthProviderInstance();
    const user = await authProvider.verifyToken(token);

    res.json({
      valid: true,
      user,
    });
  } catch (error) {
    console.error('[Auth] Token verification error:', error);

    res.status(401).json({
      valid: false,
      error: 'Invalid token',
      message: safeMessage(error),
    });
  }
});

// =====================================
// Protected Routes (Auth Required)
// =====================================

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.isAuthenticated) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please login to access this resource',
    });
  }
  next();
}

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const authProvider = getAuthProviderInstance();
    const user = await authProvider.getUser(req.session.userId);

    res.json(user);
  } catch (error) {
    console.error('[Auth] Get user error:', error);

    res.status(500).json({
      error: 'Failed to get user',
      message: safeMessage(error),
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authProvider = getAuthProviderInstance();
    await authProvider.logout(req.session.userId);

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('[Auth] Session destruction error:', err);
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    });
  } catch (error) {
    console.error('[Auth] Logout error:', error);

    res.status(500).json({
      error: 'Logout failed',
      message: safeMessage(error),
    });
  }
});

// Export middleware for use in other routes
router.requireAuth = requireAuth;

module.exports = router;
