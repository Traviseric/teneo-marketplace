'use strict';

/**
 * Tests for NL edit retry logic and extractJson robustness.
 *
 * Tests: parseEditIntent retry, extractJson code-block extraction,
 *        buildStoreFromBrief retry, all-retries-fail error messaging,
 *        escalating system prompt on retry.
 */

// ---------------------------------------------------------------------------
// Mock Anthropic SDK
// ---------------------------------------------------------------------------

const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

const {
  parseEditIntent,
  buildStoreFromBrief,
  extractJson,
  buildEditSystemPrompt,
} = require('../services/aiStoreBuilderService');

// Use retryDelay: 0 throughout to avoid real sleeps in tests
const NO_DELAY = { retryDelay: 0 };

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  mockCreate.mockReset();
});

// ---------------------------------------------------------------------------
// extractJson
// ---------------------------------------------------------------------------

describe('extractJson', () => {
  test('parses raw JSON object', () => {
    const result = extractJson('{"tagline": "New tagline"}');
    expect(result).toEqual({ tagline: 'New tagline' });
  });

  test('parses JSON from ```json code block', () => {
    const text = '```json\n{"name": "My Shop"}\n```';
    const result = extractJson(text);
    expect(result).toEqual({ name: 'My Shop' });
  });

  test('parses JSON from ``` code block without language tag', () => {
    const text = '```\n{"tagline": "Hello"}\n```';
    const result = extractJson(text);
    expect(result).toEqual({ tagline: 'Hello' });
  });

  test('parses JSON buried in prose via raw fallback', () => {
    const text = 'Here is the patch you requested: {"name": "Updated"} - apply it now.';
    const result = extractJson(text);
    expect(result).toEqual({ name: 'Updated' });
  });

  test('throws when no JSON found', () => {
    expect(() => extractJson('Sorry, I cannot help with that.')).toThrow('No JSON patch found in AI response');
  });

  test('throws when JSON in code block is malformed', () => {
    // Malformed code block falls through to raw match which also fails
    expect(() => extractJson('```json\n{broken\n```')).toThrow('No JSON patch found in AI response');
  });
});

// ---------------------------------------------------------------------------
// parseEditIntent — retry logic
// ---------------------------------------------------------------------------

describe('parseEditIntent retry', () => {
  test('succeeds on first attempt without retry', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: '{"tagline": "Better tagline"}' }] });

    const patch = await parseEditIntent('change tagline', { name: 'Shop' }, NO_DELAY);

    expect(patch.tagline).toBe('Better tagline');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('succeeds on 2nd attempt (retries once after first failure)', async () => {
    mockCreate
      .mockResolvedValueOnce({ content: [{ text: 'I cannot parse that.' }] })  // attempt 0: no JSON
      .mockResolvedValueOnce({ content: [{ text: '{"tagline": "Retry success"}' }] }); // attempt 1: ok

    const patch = await parseEditIntent('change tagline', { name: 'Shop' }, NO_DELAY);

    expect(patch.tagline).toBe('Retry success');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  test('uses escalating system prompt on retry attempts', async () => {
    mockCreate
      .mockResolvedValueOnce({ content: [{ text: 'no json here' }] })
      .mockResolvedValueOnce({ content: [{ text: '{"name": "Fixed"}' }] });

    await parseEditIntent('fix name', {}, NO_DELAY);

    // First call: base system prompt (attempt 0)
    const firstCall = mockCreate.mock.calls[0][0];
    expect(firstCall.system).not.toContain('IMPORTANT');

    // Second call: escalated system prompt (attempt 1)
    const secondCall = mockCreate.mock.calls[1][0];
    expect(secondCall.system).toContain('IMPORTANT');
    expect(secondCall.system).toContain('could not be parsed');
  });

  test('all retries fail → throws descriptive error with attempt count', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: 'No JSON here at all.' }] });

    await expect(
      parseEditIntent('do something', {}, { maxRetries: 2, retryDelay: 0 })
    ).rejects.toThrow('parseEditIntent failed after 3 attempts');

    expect(mockCreate).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  test('all retries fail → error message includes root cause', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: 'Just prose, no JSON.' }] });

    await expect(
      parseEditIntent('change name', {}, NO_DELAY)
    ).rejects.toThrow('No JSON patch found in AI response');
  });

  test('succeeds when AI returns JSON in a code block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ text: '```json\n{"tagline": "From code block"}\n```' }],
    });

    const patch = await parseEditIntent('update tagline', {}, NO_DELAY);
    expect(patch.tagline).toBe('From code block');
  });

  test('strips unknown keys from retried patch', async () => {
    mockCreate
      .mockResolvedValueOnce({ content: [{ text: 'no json' }] })
      .mockResolvedValueOnce({ content: [{ text: '{"name": "Valid", "deleteAll": true}' }] });

    const patch = await parseEditIntent('change name', {}, NO_DELAY);
    expect(patch.name).toBe('Valid');
    expect(patch.deleteAll).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildStoreFromBrief — retry on validateStoreConfig failure
// ---------------------------------------------------------------------------

describe('buildStoreFromBrief retry', () => {
  const validConfig = {
    name: 'My Shop',
    tagline: 'Best shop',
    commerce: { fulfillment_type: 'digital', payment_provider: 'stripe' },
  };

  test('succeeds on 2nd attempt when first response fails validation', async () => {
    const badConfig = { tagline: 'No name here', commerce: { fulfillment_type: 'digital', payment_provider: 'stripe' } };

    mockCreate
      .mockResolvedValueOnce({ content: [{ text: JSON.stringify(badConfig) }] })  // fails validation
      .mockResolvedValueOnce({ content: [{ text: JSON.stringify(validConfig) }] }); // passes

    const result = await buildStoreFromBrief('candle shop', NO_DELAY);

    expect(result.name).toBe('My Shop');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  test('all retries fail → throws with attempt count in message', async () => {
    const badConfig = { tagline: 'Missing name', commerce: {} };
    mockCreate.mockResolvedValue({ content: [{ text: JSON.stringify(badConfig) }] });

    await expect(
      buildStoreFromBrief('test brief', { maxRetries: 2, retryDelay: 0 })
    ).rejects.toThrow('buildStoreFromBrief failed after 3 attempts');

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// buildEditSystemPrompt (exported for testability)
// ---------------------------------------------------------------------------

describe('buildEditSystemPrompt', () => {
  test('attempt 0 returns base prompt without IMPORTANT', () => {
    const prompt = buildEditSystemPrompt(0);
    expect(prompt).toContain('Output ONLY a JSON object');
    expect(prompt).not.toContain('IMPORTANT');
  });

  test('attempt 1 includes IMPORTANT escalation', () => {
    const prompt = buildEditSystemPrompt(1);
    expect(prompt).toContain('IMPORTANT');
    expect(prompt).toContain('could not be parsed');
  });

  test('attempt 2 also includes escalation', () => {
    const prompt = buildEditSystemPrompt(2);
    expect(prompt).toContain('IMPORTANT');
  });
});
