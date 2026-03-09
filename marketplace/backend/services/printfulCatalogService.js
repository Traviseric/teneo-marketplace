'use strict';

const axios = require('axios');

// In-memory cache: Printful catalog changes rarely, so 1-hour TTL is fine.
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const cache = {
  products: { data: null, fetchedAt: 0 },
  variants: {}, // keyed by productId
};

function isFresh(entry) {
  return entry.data !== null && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

class PrintfulCatalogService {
  constructor() {
    this.baseUrl = (process.env.PRINTFUL_API_BASE || 'https://api.printful.com').replace(/\/$/, '');
    this.apiKey = process.env.PRINTFUL_API_KEY || '';
    this.enabled = Boolean(this.apiKey);
  }

  _headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch the Printful products list (printful "catalog" products, not store sync products).
   * Results are cached in-memory for 1 hour.
   * @returns {Promise<Array>} Array of product objects from Printful
   */
  async getProducts() {
    if (!this.enabled) {
      throw new Error('PRINTFUL_API_KEY not configured');
    }

    if (isFresh(cache.products)) {
      return cache.products.data;
    }

    const response = await axios.get(`${this.baseUrl}/products`, {
      headers: this._headers(),
      timeout: 15000,
    });

    const items = response.data?.result || [];
    cache.products = { data: items, fetchedAt: Date.now() };
    return items;
  }

  /**
   * Fetch variants for a specific Printful catalog product.
   * Results are cached per productId for 1 hour.
   * @param {string|number} productId
   * @returns {Promise<{product: object, variants: Array}>}
   */
  async getVariants(productId) {
    if (!this.enabled) {
      throw new Error('PRINTFUL_API_KEY not configured');
    }

    const key = String(productId);
    if (cache.variants[key] && isFresh(cache.variants[key])) {
      return cache.variants[key].data;
    }

    const response = await axios.get(`${this.baseUrl}/products/${encodeURIComponent(key)}`, {
      headers: this._headers(),
      timeout: 15000,
    });

    const result = response.data?.result || {};
    const payload = {
      product: result.product || {},
      variants: result.variants || [],
    };

    cache.variants[key] = { data: payload, fetchedAt: Date.now() };
    return payload;
  }

  /** Invalidate the full cache (useful after product configuration changes). */
  clearCache() {
    cache.products = { data: null, fetchedAt: 0 };
    cache.variants = {};
  }
}

module.exports = new PrintfulCatalogService();
