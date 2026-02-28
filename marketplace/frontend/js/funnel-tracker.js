/**
 * Funnel Conversion Tracker
 * Tracks pageviews, CTA clicks, checkout starts, and purchases for funnel analytics.
 * Reads funnelId from <meta name="funnel-id"> tag on the page.
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/funnels/events';
  var funnelId = null;
  var sessionId = null;

  function init() {
    var meta = document.querySelector('meta[name="funnel-id"]');
    if (!meta || !meta.content) return;
    funnelId = meta.content;
    sessionId = getSessionId();

    // Auto-fire pageview on load
    trackEvent('pageview', {});

    // CTA click tracking
    document.addEventListener('click', function (e) {
      var target = e.target;
      // Walk up DOM to find data-funnel-cta attribute
      while (target && target !== document) {
        if (target.getAttribute && target.getAttribute('data-funnel-cta')) {
          trackEvent('cta_click', { label: target.getAttribute('data-funnel-cta') });
          break;
        }
        target = target.parentNode;
      }
    });

    // Checkout start tracking — elements with data-funnel-checkout
    document.addEventListener('click', function (e) {
      var target = e.target;
      while (target && target !== document) {
        if (target.getAttribute && target.getAttribute('data-funnel-checkout')) {
          trackEvent('checkout_start', { label: target.getAttribute('data-funnel-checkout') });
          break;
        }
        target = target.parentNode;
      }
    });
  }

  function trackEvent(eventType, metadata) {
    if (!funnelId) return;
    var payload = {
      funnelId: funnelId,
      pageSlug: funnelId,
      eventType: eventType,
      sessionId: sessionId,
      metadata: metadata || {}
    };
    // Fire-and-forget: non-blocking
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {
        // Silently ignore network errors — analytics must not break the page
      });
    } catch (err) {
      // Silently ignore — analytics must not break the page
    }
  }

  function getSessionId() {
    try {
      var key = '_ftkSid';
      var sid = sessionStorage.getItem(key);
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(key, sid);
      }
      return sid;
    } catch (e) {
      return null;
    }
  }

  // Expose trackEvent globally so checkout pages can call it directly
  window.funnelTracker = { trackEvent: trackEvent };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
