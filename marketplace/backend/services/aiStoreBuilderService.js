/**
 * AI Store Builder Service
 *
 * Generates a store_config JSON from a natural-language business brief using Claude.
 *
 * Usage:
 *   const { buildStoreFromBrief } = require('./aiStoreBuilderService');
 *   const config = await buildStoreFromBrief('I sell soy candles online, earthy aesthetic');
 *
 * Requires ANTHROPIC_API_KEY in environment. Server starts gracefully without it —
 * calls will fail with a descriptive error if the key is missing at request time.
 */

const schema = require('../schemas/store-config.schema.json');

/**
 * Validate and coerce a store config returned by the AI.
 * Throws a descriptive error if required fields are missing.
 * Invalid enum values are coerced to safe defaults.
 */
function validateStoreConfig(config) {
  const required = ['name', 'tagline', 'commerce'];
  for (const field of required) {
    if (!config[field]) throw new Error(`Generated config missing required field: ${field}`);
  }
  const { commerce } = config;
  const validFulfillment = ['digital', 'pod', 'service'];
  if (commerce.fulfillment_type && !validFulfillment.includes(commerce.fulfillment_type)) {
    commerce.fulfillment_type = 'digital';
  }
  const validProvider = ['stripe', 'arxmint', 'both'];
  if (commerce.payment_provider && !validProvider.includes(commerce.payment_provider)) {
    commerce.payment_provider = 'stripe';
  }
  if (Array.isArray(commerce.products)) {
    const validTypes = ['ebook', 'course', 'service', 'physical'];
    commerce.products = commerce.products.filter(p => p && p.name && p.price != null);
    commerce.products.forEach(p => {
      if (p.type && !validTypes.includes(p.type)) p.type = 'ebook';
      p.price = Number(p.price);
      if (isNaN(p.price) || p.price < 0) p.price = 0;
    });
  }
  return config;
}

const SCHEMA_TOP_KEYS = new Set(['name', 'tagline', 'palette', 'fonts', 'commerce', 'modules']);

/**
 * Filter a patch object to only include known top-level schema keys.
 * Removes any hallucinated or unknown keys from the AI response.
 */
function filterPatch(patch) {
  const filtered = {};
  for (const key of Object.keys(patch)) {
    if (SCHEMA_TOP_KEYS.has(key)) filtered[key] = patch[key];
  }
  return filtered;
}

async function buildStoreFromBrief(brief) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file to use the AI Store Builder.');
  }

  // Lazy-require so the server starts without the SDK if the key is absent
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are an expert e-commerce store designer. Given this business brief, generate a complete store configuration as valid JSON matching the schema provided.

BUSINESS BRIEF:
${brief}

OUTPUT: Return ONLY valid JSON matching this schema (no markdown, no explanation):
${JSON.stringify(schema, null, 2)}

Be creative with palette and content. Make the store feel professional and on-brand.`
    }]
  });

  const text = message.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in AI response');

  return validateStoreConfig(JSON.parse(jsonMatch[0]));
}

/**
 * Deep-merge a patch object into a target object.
 * - Primitive fields: patch overwrites target
 * - Arrays: patch replaces target array entirely
 * - Plain objects: merge recursively
 */
function deepMerge(target, patch) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(patch)) {
    const pval = patch[key];
    const tval = target[key];
    if (Array.isArray(pval)) {
      result[key] = pval;
    } else if (pval && typeof pval === 'object' && !Array.isArray(pval) && tval && typeof tval === 'object' && !Array.isArray(tval)) {
      result[key] = deepMerge(tval, pval);
    } else {
      result[key] = pval;
    }
  }
  return result;
}

/**
 * Parse a natural-language edit instruction against an existing store config.
 * Returns a partial patch object (only changed fields).
 *
 * @param {string} instruction - e.g. "change hero text to 'Handmade with love'"
 * @param {object} existingConfig - current StoreConfig JSON
 * @returns {object} partial config patch
 */
async function parseEditIntent(instruction, existingConfig) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. AI editing requires the API key.');
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are editing a store configuration JSON. Return ONLY the fields that need to change as a JSON object — do NOT return the full config.

CURRENT CONFIG:
${JSON.stringify(existingConfig, null, 2)}

EDIT INSTRUCTION: "${instruction}"

Return ONLY valid JSON containing the changed fields (partial patch). No markdown, no explanation.`
    }]
  });

  const text = message.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON patch found in AI response');
  return filterPatch(JSON.parse(jsonMatch[0]));
}

module.exports = { buildStoreFromBrief, parseEditIntent, deepMerge, validateStoreConfig, filterPatch };
