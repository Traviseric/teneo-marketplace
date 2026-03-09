/**
 * AI Funnel Builder Service
 *
 * Generates a structured funnel config from a natural-language brief using Claude.
 *
 * Usage:
 *   const { generateFunnel } = require('./aiFunnelBuilderService');
 *   const config = await generateFunnel('Create a lead magnet funnel for my copywriting course');
 *
 * Requires ANTHROPIC_API_KEY in environment. Server starts gracefully without it —
 * calls fail with a descriptive error if the key is missing at request time.
 *
 * Follows the same lazy-require pattern as aiCourseBuilderService.js and aiStoreBuilderService.js.
 */

const FUNNEL_SCHEMA = `{
  "headline": "string — main landing page headline",
  "subheadline": "string — supporting subheadline (1-2 sentences)",
  "cta_text": "string — call-to-action button label (e.g. 'Get Free Access')",
  "lead_magnet_title": "string — name of the free lead magnet offered",
  "lead_magnet_description": "string — 2-3 sentence description of what the subscriber gets",
  "email_sequence": [
    {
      "day": "integer — delay in days from opt-in (0 = immediate)",
      "subject": "string — email subject line",
      "preview_text": "string — email preview/preheader text (max 90 chars)",
      "body_outline": "string — 3-5 bullet points describing the email content"
    }
  ],
  "upsell_product": "string | null — optional paid product to pitch at sequence end"
}`;

async function generateFunnel(brief) {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file to use the AI Funnel Builder.');
    }

    // Lazy-require so the server starts without the SDK if the key is absent
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();

    const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
            role: 'user',
            content: `You are an expert conversion copywriter and email funnel strategist. Given this brief, generate a complete funnel config as valid JSON.

BRIEF:
${brief}

OUTPUT: Return ONLY valid JSON matching this schema exactly (no markdown fences, no explanation):
${FUNNEL_SCHEMA}

Guidelines:
- headline should be compelling and benefit-driven (max 10 words)
- subheadline expands on the value proposition (1-2 sentences)
- cta_text should be action-oriented (e.g. "Get Instant Access", "Send Me the Guide")
- lead_magnet_title is the name of the free resource (e.g. "5-Day Email Marketing Crash Course")
- email_sequence should have 5-7 emails, starting with day 0 (delivery) through 5-14 days
- The final email (day 5-7) should transition to the paid offer if upsell_product is specified
- body_outline uses 3-5 bullet points summarising the email content, not full prose
- day values: 0 (immediate), 1, 2, 3, 5, 7, 14 (spaced naturally)
- upsell_product: name of the paid offer or null if not applicable`
        }]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    return JSON.parse(jsonMatch[0]);
}

module.exports = { generateFunnel };
