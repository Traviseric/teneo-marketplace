/**
 * Teneo Marketplace — Frontend Auth Module
 *
 * Handles NIP-07 Nostr authentication (window.nostr extension).
 * Used by login.html and any page that needs auth detection.
 *
 * NIP-07: https://github.com/nostr-protocol/nips/blob/master/07.md
 * NIP-98: https://github.com/nostr-protocol/nips/blob/master/98.md
 *
 * Ported from: C:\code\arxmint\lib\nostr-auth.ts
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.TeneoAuth = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =========================================================
  // NIP-07 Extension Detection
  // =========================================================

  /**
   * Check if a NIP-07 browser extension (Alby, nos2x, etc.) is available.
   * @returns {boolean}
   */
  function hasNostrExtension() {
    return typeof window !== 'undefined' && typeof window.nostr !== 'undefined';
  }

  /**
   * Wait up to `timeoutMs` for a NIP-07 extension to appear.
   * Extensions may inject window.nostr after DOMContentLoaded.
   *
   * @param {number} [timeoutMs=2000]
   * @returns {Promise<boolean>}
   */
  function waitForExtension(timeoutMs) {
    timeoutMs = timeoutMs || 2000;
    if (hasNostrExtension()) return Promise.resolve(true);

    return new Promise(function (resolve) {
      var start = Date.now();
      var interval = setInterval(function () {
        if (hasNostrExtension()) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start >= timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 200);
    });
  }

  // =========================================================
  // NIP-98 HTTP Auth Event Creation
  // =========================================================

  /**
   * Create and sign a NIP-98 HTTP auth event using the user's Nostr extension.
   *
   * The signed event is base64-encoded for transport in request bodies.
   *
   * @param {string} url  - Full URL of the target endpoint
   * @param {string} method  - HTTP method (POST, GET, etc.)
   * @returns {Promise<string>}  base64-encoded JSON of the signed event
   */
  async function createNip98Token(url, method) {
    if (!window.nostr) {
      throw new Error('No NIP-07 extension found. Install Alby or nos2x.');
    }

    var unsignedEvent = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', url],
        ['method', method.toUpperCase()],
      ],
      content: '',
    };

    var signed = await window.nostr.signEvent(unsignedEvent);
    return btoa(JSON.stringify(signed));
  }

  // =========================================================
  // Nostr Login Flow
  // =========================================================

  /**
   * Complete NIP-07 login:
   * 1. Get public key from extension
   * 2. Sign a NIP-98 auth event for POST /api/auth/nostr/verify
   * 3. POST the event to the backend
   * 4. Return the user object on success
   *
   * @returns {Promise<{id: string, name: string, pubkey: string, email: string}>}
   */
  async function loginWithNostr() {
    if (!window.nostr) {
      throw new Error('No Nostr extension detected. Install Alby or nos2x to continue.');
    }

    // Get public key (prompts extension if needed)
    var pubkey = await window.nostr.getPublicKey();
    if (!pubkey) {
      throw new Error('Nostr login cancelled — no public key returned.');
    }

    // Build the target URL for NIP-98 — must match the backend endpoint exactly
    var verifyUrl = window.location.origin + '/api/auth/nostr/verify';
    var token = await createNip98Token(verifyUrl, 'POST');

    // POST to backend
    var response = await fetch('/api/auth/nostr/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: token }),
    });

    var data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Nostr verification failed');
    }

    return data.user;
  }

  // =========================================================
  // Session / Auth State Helpers
  // =========================================================

  /**
   * Check if the current session is authenticated.
   * @returns {Promise<{authenticated: boolean, user?: object}>}
   */
  async function getSession() {
    try {
      var resp = await fetch('/api/auth/me');
      if (resp.ok) {
        var user = await resp.json();
        return { authenticated: true, user: user };
      }
      return { authenticated: false };
    } catch (_) {
      return { authenticated: false };
    }
  }

  /**
   * Logout the current session.
   * @returns {Promise<void>}
   */
  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    window.location.href = '/login.html';
  }

  // =========================================================
  // UI Helpers — Show/Hide Nostr button based on extension
  // =========================================================

  /**
   * Reveal the Nostr login section (#nostr-section) if an extension is present.
   * Call this on DOMContentLoaded.
   */
  function initNostrUI() {
    waitForExtension(1500).then(function (available) {
      var nostrSection = document.getElementById('nostr-section');
      if (nostrSection) {
        nostrSection.style.display = available ? 'block' : 'none';
      }
    });
  }

  // =========================================================
  // Public API
  // =========================================================

  return {
    hasNostrExtension: hasNostrExtension,
    waitForExtension: waitForExtension,
    createNip98Token: createNip98Token,
    loginWithNostr: loginWithNostr,
    getSession: getSession,
    logout: logout,
    initNostrUI: initNostrUI,
  };
}));
