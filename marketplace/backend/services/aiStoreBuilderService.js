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

  return JSON.parse(jsonMatch[0]);
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
  return JSON.parse(jsonMatch[0]);
}

module.exports = { buildStoreFromBrief, parseEditIntent, deepMerge };
