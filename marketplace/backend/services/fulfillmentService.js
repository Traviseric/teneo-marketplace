'use strict';

const printfulProvider = require('./printfulFulfillmentProvider');
const luluProvider = require('./luluFulfillmentProvider');
const manualProvider = require('./manualFulfillmentProvider');

class FulfillmentService {
  constructor() {
    this.providers = new Map();
    this.register(printfulProvider);
    this.register(luluProvider);
    this.register(manualProvider);
  }

  register(provider) {
    if (!provider || !provider.name) {
      throw new Error('Invalid fulfillment provider');
    }
    this.providers.set(provider.name, provider);
  }

  getProvider(name) {
    if (!name) return null;
    return this.providers.get(name) || null;
  }

  async createOrder(providerName, params) {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Unknown fulfillment provider: ${providerName}`);
    }
    return provider.createOrder(params);
  }
}

module.exports = new FulfillmentService();
