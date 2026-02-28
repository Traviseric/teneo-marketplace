/**
 * NostrAuthProvider - NIP-07 + NIP-98 Nostr Authentication
 *
 * Implements decentralized authentication via Nostr browser extensions
 * (Alby, nos2x, etc.) using NIP-07 for key access and NIP-98 for HTTP auth.
 *
 * How it works:
 * 1. Frontend detects window.nostr (NIP-07 extension)
 * 2. Frontend gets user's public key via window.nostr.getPublicKey()
 * 3. Frontend signs a NIP-98 HTTP auth event (kind 27235) via window.nostr.signEvent()
 * 4. Frontend POSTs the signed event to /api/auth/nostr/verify
 * 5. Backend verifies the Schnorr signature using @noble/curves/secp256k1
 * 6. Backend creates/updates local user record keyed by nostr_pubkey
 * 7. Session is established
 *
 * Reference: C:\code\arxmint\lib\nostr-auth.ts
 */

const AuthProvider = require('../AuthProvider');
const crypto = require('crypto');
const db = require('../../database/db');

// @noble/curves for Schnorr signature verification (already installed)
const { schnorr } = require('@noble/curves/secp256k1');
const { sha256 } = require('@noble/hashes/sha256');
const { utf8ToBytes, bytesToHex } = require('@noble/hashes/utils');

/** NIP-98 HTTP Auth event kind */
const NIP98_KIND = 27235;

class NostrAuthProvider extends AuthProvider {
  constructor(config = {}) {
    super();
    this.maxEventAgeSec = config.maxEventAgeSec || 60;
    this._ensureNostrPubkeyColumn();
  }

  /**
   * Not applicable — Nostr identity is established by pubkey, not email.
   */
  async register(email, name) {
    throw new Error('Nostr auth uses NIP-07 key identity, not email registration. Use /api/auth/nostr/verify instead.');
  }

  /**
   * Not applicable — Nostr auth uses NIP-07 browser extension, not email.
   */
  async login(email) {
    throw new Error('Nostr auth uses NIP-07 browser extension, not email login. Use /api/auth/nostr/verify instead.');
  }

  /**
   * Verify a NIP-98 token string (base64-encoded JSON event).
   * Used by the /api/auth/nostr/verify endpoint.
   *
   * @param {string} token - base64-encoded NIP-98 signed event JSON
   * @param {string|null} expectedUrl - expected URL tag value (null to skip check)
   * @param {string|null} expectedMethod - expected method tag value (null to skip check)
   * @returns {Promise<{id: string, name: string, pubkey: string}>}
   */
  async verifyNostrToken(token, expectedUrl, expectedMethod) {
    const event = this._parseToken(token);
    this._validateNip98Structure(event, expectedUrl, expectedMethod);
    this._verifySignature(event);

    const user = await this._getOrCreateUser(event.pubkey);
    this._logAudit(user.id, 'login', true, {
      pubkey: event.pubkey,
      via: 'nip98',
    });

    return user;
  }

  /**
   * verifyToken — wraps verifyNostrToken for AuthProvider interface compatibility.
   * Token should be a base64-encoded NIP-98 event (URL/method checks are skipped).
   */
  async verifyToken(token) {
    return this.verifyNostrToken(token, null, null);
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    const user = db
      .prepare(
        `SELECT id, email, name, avatar_url, credits, account_status, created_at, last_login,
                metadata
         FROM users
         WHERE id = ? AND auth_provider = 'nostr'`
      )
      .get(userId);

    if (!user) throw new Error('User not found');

    const meta = user.metadata ? JSON.parse(user.metadata) : {};
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      credits: user.credits,
      account_status: user.account_status,
      created_at: user.created_at,
      last_login: user.last_login,
      email_verified: true, // Nostr identity is self-authenticated
      pubkey: meta.nostr_pubkey,
    };
  }

  /**
   * Get user by email — not meaningful for Nostr, but required by interface.
   */
  async getUserByEmail(email) {
    const user = db
      .prepare(`SELECT id, email, name, avatar_url, credits, account_status, metadata FROM users WHERE email = ? AND auth_provider = 'nostr'`)
      .get(email);

    if (!user) throw new Error('User not found');
    const meta = user.metadata ? JSON.parse(user.metadata) : {};
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      credits: user.credits,
      email_verified: true,
      pubkey: meta.nostr_pubkey,
    };
  }

  /**
   * Get user by Nostr pubkey (hex)
   */
  async getUserByPubkey(pubkey) {
    // Try nostr_pubkey column first (available after schema migration)
    let user;
    try {
      user = db
        .prepare(`SELECT id, email, name, avatar_url, credits, account_status, metadata FROM users WHERE nostr_pubkey = ?`)
        .get(pubkey);
    } catch (_) {
      // Column might not exist yet — fall back to synthetic email lookup
      const syntheticEmail = `${pubkey}@nostr.local`;
      user = db
        .prepare(`SELECT id, email, name, avatar_url, credits, account_status, metadata FROM users WHERE email = ? AND auth_provider = 'nostr'`)
        .get(syntheticEmail);
    }

    if (!user) throw new Error('User not found');
    return user;
  }

  /**
   * Logout (no extra cleanup needed for Nostr)
   */
  async logout(userId) {
    this._logAudit(userId, 'logout', true, {});
    return;
  }

  /**
   * Provider metadata
   */
  getMetadata() {
    return {
      type: 'nostr',
      name: 'Nostr (NIP-07)',
      supportsOAuth: false,
      description: 'Decentralized authentication via Nostr browser extension (Alby, nos2x)',
      features: [
        'NIP-07 public key access',
        'NIP-98 HTTP auth signing',
        'No email required',
        'Self-sovereign identity',
      ],
    };
  }

  // =============================================
  // Private Helpers
  // =============================================

  /**
   * Parse base64-encoded NIP-98 token into event object.
   */
  _parseToken(token) {
    try {
      const json = Buffer.from(token, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (err) {
      throw new Error('Invalid NIP-98 token: cannot parse base64 JSON');
    }
  }

  /**
   * Validate NIP-98 event structure, kind, timestamp, URL, and method.
   */
  _validateNip98Structure(event, expectedUrl, expectedMethod) {
    if (!event || typeof event !== 'object') {
      throw new Error('Invalid NIP-98 event: not an object');
    }
    if (event.kind !== NIP98_KIND) {
      throw new Error(`Invalid event kind: expected ${NIP98_KIND}, got ${event.kind}`);
    }
    if (!event.pubkey || typeof event.pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(event.pubkey)) {
      throw new Error('Invalid pubkey: must be 64-character hex string');
    }
    if (!event.sig || typeof event.sig !== 'string' || !/^[0-9a-f]{128}$/i.test(event.sig)) {
      throw new Error('Invalid sig: must be 128-character hex string');
    }
    if (!event.id || typeof event.id !== 'string' || !/^[0-9a-f]{64}$/i.test(event.id)) {
      throw new Error('Invalid id: must be 64-character hex string');
    }

    // Freshness check — reject events older than maxEventAgeSec
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - event.created_at) > this.maxEventAgeSec) {
      throw new Error(`NIP-98 event expired (age: ${Math.abs(now - event.created_at)}s, max: ${this.maxEventAgeSec}s)`);
    }

    // URL tag check
    if (expectedUrl) {
      const urlTag = Array.isArray(event.tags) && event.tags.find(t => t[0] === 'u');
      if (!urlTag || urlTag[1] !== expectedUrl) {
        throw new Error('NIP-98 URL mismatch');
      }
    }

    // Method tag check
    if (expectedMethod) {
      const methodTag = Array.isArray(event.tags) && event.tags.find(t => t[0] === 'method');
      if (!methodTag || methodTag[1] !== expectedMethod.toUpperCase()) {
        throw new Error('NIP-98 method mismatch');
      }
    }
  }

  /**
   * Verify the Schnorr signature on a Nostr event using @noble/curves/secp256k1.
   *
   * Steps:
   * 1. Compute the canonical event ID (SHA256 of the serialized event data)
   * 2. Verify event.id matches the computed hash
   * 3. Verify the Schnorr signature (event.sig) against event.id with event.pubkey
   */
  _verifySignature(event) {
    // Step 1: compute canonical event ID
    const serialized = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content,
    ]);
    const computedId = bytesToHex(sha256(utf8ToBytes(serialized)));

    // Step 2: verify event ID matches
    if (event.id !== computedId) {
      throw new Error('NIP-98 event ID mismatch — event may have been tampered with');
    }

    // Step 3: verify Schnorr signature
    // schnorr.verify(sig_hex, msg_hex, pubkey_hex) → boolean
    const isValid = schnorr.verify(event.sig, event.id, event.pubkey);
    if (!isValid) {
      throw new Error('Invalid Nostr signature');
    }
  }

  /**
   * Find or create a local user record for the given Nostr pubkey.
   */
  async _getOrCreateUser(pubkey) {
    const now = new Date().toISOString();
    const syntheticEmail = `${pubkey}@nostr.local`;

    // Look up by nostr_pubkey column (if available) or synthetic email
    let user;
    try {
      user = db
        .prepare(`SELECT id, email, name, avatar_url, credits, account_status FROM users WHERE nostr_pubkey = ?`)
        .get(pubkey);
    } catch (_) {
      // Column may not exist yet — fall through to email-based lookup
    }

    if (!user) {
      user = db
        .prepare(`SELECT id, email, name, avatar_url, credits, account_status FROM users WHERE email = ? AND auth_provider = 'nostr'`)
        .get(syntheticEmail);
    }

    if (user) {
      // Update last login
      db.prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?')
        .run(now, now, user.id);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        credits: user.credits,
        email_verified: true,
        pubkey,
      };
    }

    // Create new user
    const userId = crypto.randomUUID();
    const shortPubkey = pubkey.slice(0, 8) + '...' + pubkey.slice(-4);
    const displayName = `nostr:${shortPubkey}`;
    const meta = JSON.stringify({ nostr_pubkey: pubkey });

    db.prepare(
      `INSERT INTO users (
        id, email, name, auth_provider, email_verified,
        signup_source, credits, created_at, updated_at, last_login, metadata
      ) VALUES (?, ?, ?, 'nostr', 1, 'nostr', 0, ?, ?, ?, ?)`
    ).run(userId, syntheticEmail, displayName, now, now, now, meta);

    // Try to also set nostr_pubkey column if it exists
    try {
      db.prepare('UPDATE users SET nostr_pubkey = ? WHERE id = ?').run(pubkey, userId);
    } catch (_) {
      // Column may not exist yet — pubkey is stored in metadata JSON
    }

    return {
      id: userId,
      email: syntheticEmail,
      name: displayName,
      avatar_url: null,
      credits: 0,
      email_verified: true,
      pubkey,
    };
  }

  /**
   * Add nostr_pubkey column + index to users table if they don't exist.
   * Uses sqlite3's async db.run() API so errors are silently swallowed
   * (SQLite doesn't support ADD COLUMN IF NOT EXISTS; failure = column exists).
   */
  _ensureNostrPubkeyColumn() {
    db.run('ALTER TABLE users ADD COLUMN nostr_pubkey TEXT', function () {
      // Ignore error — column already exists or table not yet created
      db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nostr_pubkey ON users(nostr_pubkey)', function () {
        // Ignore — index may already exist
      });
    });
  }

  /**
   * Log auth audit event
   */
  _logAudit(userId, eventType, success, metadata = {}) {
    try {
      db.prepare(
        `INSERT INTO auth_audit_log (
          user_id, event_type, auth_provider, success,
          failure_reason, metadata, created_at
        ) VALUES (?, ?, 'nostr', ?, ?, ?, datetime('now'))`
      ).run(
        userId,
        eventType,
        success ? 1 : 0,
        success ? null : metadata.error,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('[NostrAuth] Failed to log audit event:', error);
    }
  }
}

module.exports = NostrAuthProvider;
