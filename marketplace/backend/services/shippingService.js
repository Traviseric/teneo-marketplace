'use strict';

const printfulProvider = require('./printfulFulfillmentProvider');

/**
 * Get shipping rate estimates for physical/POD items via Printful.
 *
 * @param {Array<{variantId: string|number, quantity: number}>} items
 * @param {{name?: string, address1: string, city: string, state_code?: string, country_code: string, zip: string}} recipient
 * @returns {Promise<Array<{id: string, name: string, rate: string, currency: string, minDeliveryDays: number|null, maxDeliveryDays: number|null}>|null>}
 *   Returns null when Printful is not configured (caller should show fallback message).
 */
async function getShippingRates(items, recipient) {
  if (!printfulProvider.enabled) {
    return null;
  }

  const printfulItems = items.map(item => ({
    variant_id: Number(item.variantId),
    quantity: Number(item.quantity) || 1,
  }));

  const printfulRecipient = {
    address1: recipient.address1,
    city: recipient.city,
    country_code: recipient.country_code,
    zip: String(recipient.zip),
    ...(recipient.state_code ? { state_code: recipient.state_code } : {}),
    ...(recipient.name ? { name: recipient.name } : {}),
  };

  const rates = await printfulProvider.estimateShippingRates({
    recipient: printfulRecipient,
    items: printfulItems,
  });

  return (rates || []).map(r => ({
    id: r.id,
    name: r.name,
    rate: r.rate,
    currency: r.currency || 'USD',
    minDeliveryDays: r.minDeliveryDays || r.min_delivery_days || null,
    maxDeliveryDays: r.maxDeliveryDays || r.max_delivery_days || null,
  }));
}

module.exports = { getShippingRates };
