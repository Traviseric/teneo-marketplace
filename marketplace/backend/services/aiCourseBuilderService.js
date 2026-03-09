/**
 * AI Course Builder Service
 *
 * Generates a structured course outline from a natural-language brief using Claude.
 *
 * Usage:
 *   const { generateCourse } = require('./aiCourseBuilderService');
 *   const course = await generateCourse('create a 5-module course on email marketing');
 *
 * Requires ANTHROPIC_API_KEY in environment. Server starts gracefully without it —
 * calls fail with a descriptive error if the key is missing at request time.
 */

const COURSE_SCHEMA = `{
  "title": "string — course title",
  "description": "string — 2-3 sentence course description",
  "price_cents": "integer — suggested price in cents (e.g. 4999 = $49.99)",
  "modules": [
    {
      "title": "string — module title",
      "order": "integer — 1-based",
      "lessons": [
        {
          "title": "string — lesson title",
          "content": "string — 2-4 sentence lesson summary / body text",
          "duration_minutes": "integer — estimated watch/read time",
          "order": "integer — 1-based within module"
        }
      ]
    }
  ]
}`;

async function generateCourse(brief) {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file to use the AI Course Builder.');
    }

    // Lazy-require so the server starts without the SDK if the key is absent
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();

    const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
            role: 'user',
            content: `You are an expert online course creator. Given this brief, generate a complete course outline as valid JSON.

BRIEF:
${brief}

OUTPUT: Return ONLY valid JSON matching this schema exactly (no markdown fences, no explanation):
${COURSE_SCHEMA}

Guidelines:
- Create substantive, professional module and lesson titles
- Each module should have 3-5 lessons
- Lesson content should be 2-4 sentences summarising what the student will learn
- duration_minutes should be realistic (5-20 min per lesson)
- price_cents should reflect the scope (e.g. 1999–9999)
- order fields are 1-based integers`
        }]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    return JSON.parse(jsonMatch[0]);
}

module.exports = { generateCourse };
