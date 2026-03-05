/**
 * Tests for EmailMarketingService sequence enrollment and processing.
 *
 * Covers:
 *   - processTemplateVariables(): pure function, no DB required
 *   - enrollInSequence(): sequence not found → null
 *   - enrollInSequence(): new enrollment created
 *   - enrollInSequence(): already enrolled → returns existing record
 *   - injectTracking(): tracking pixel and click-wrapping
 */

// Mock emailService so sendEmail() never attempts real SMTP
jest.mock('../marketplace/backend/services/emailService', () => ({
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendDownloadEmail: jest.fn().mockResolvedValue(true)
}));

const EmailMarketingService = require('../marketplace/backend/services/emailMarketingService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fresh mock Promise-based db for each test */
function createMockDb() {
    return {
        get: jest.fn(),
        all: jest.fn(),
        run: jest.fn()
    };
}

// ─── processTemplateVariables ─────────────────────────────────────────────────

describe('EmailMarketingService.processTemplateVariables()', () => {
    let service;
    beforeEach(() => {
        service = new EmailMarketingService(createMockDb());
    });

    it('replaces {{VARIABLE}} placeholders with the provided values', () => {
        const template = 'Hello {{SUBSCRIBER_NAME}}, your email is {{SUBSCRIBER_EMAIL}}.';
        const result = service.processTemplateVariables(template, {
            SUBSCRIBER_NAME: 'Alice',
            SUBSCRIBER_EMAIL: 'alice@example.com'
        });
        expect(result).toBe('Hello Alice, your email is alice@example.com.');
    });

    it('returns the template unchanged when the variables map is empty', () => {
        const template = 'Hello {{SUBSCRIBER_NAME}}!';
        expect(service.processTemplateVariables(template, {})).toBe('Hello {{SUBSCRIBER_NAME}}!');
    });

    it('replaces every occurrence of the same variable', () => {
        const template = '{{NAME}} and {{NAME}} again';
        const result = service.processTemplateVariables(template, { NAME: 'Bob' });
        expect(result).toBe('Bob and Bob again');
    });

    it('substitutes missing variable values with empty string', () => {
        const template = 'Hi {{SUBSCRIBER_NAME}}!';
        const result = service.processTemplateVariables(template, { SUBSCRIBER_NAME: '' });
        expect(result).toBe('Hi !');
    });
});

// ─── enrollInSequence ────────────────────────────────────────────────────────

describe('EmailMarketingService.enrollInSequence()', () => {
    let service;
    let mockDb;

    beforeEach(() => {
        mockDb = createMockDb();
        service = new EmailMarketingService(mockDb);
    });

    it('returns null when the named sequence does not exist', async () => {
        mockDb.get.mockResolvedValue(null); // sequence lookup returns nothing

        const result = await service.enrollInSequence(1, 'Nonexistent Sequence');
        expect(result).toBeNull();
        expect(mockDb.run).not.toHaveBeenCalled();
    });

    it('creates a new subscriber_sequences record when subscriber is not yet enrolled', async () => {
        // First db.get: sequence found
        mockDb.get.mockResolvedValueOnce({ id: 10 });
        // Second db.get: no existing active enrollment
        mockDb.get.mockResolvedValueOnce(null);
        // db.run: INSERT returns lastID
        mockDb.run.mockResolvedValue({ lastID: 55 });

        const result = await service.enrollInSequence(42, 'Welcome Sequence');

        expect(result).toEqual({ id: 55, sequenceId: 10 });
        expect(mockDb.run).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO subscriber_sequences'),
            [42, 10]
        );
    });

    it('returns the existing record without inserting when subscriber is already enrolled', async () => {
        // First db.get: sequence found
        mockDb.get.mockResolvedValueOnce({ id: 10 });
        // Second db.get: active enrollment already exists
        mockDb.get.mockResolvedValueOnce({ id: 77, status: 'active' });

        const result = await service.enrollInSequence(42, 'Welcome Sequence');

        expect(result).toEqual({ id: 77, status: 'active' });
        // Should NOT attempt a duplicate INSERT
        expect(mockDb.run).not.toHaveBeenCalled();
    });
});

// ─── injectTracking ───────────────────────────────────────────────────────────

describe('EmailMarketingService.injectTracking()', () => {
    let service;
    beforeEach(() => {
        process.env.BASE_URL = 'http://localhost:3001';
        service = new EmailMarketingService(createMockDb());
    });

    it('appends a 1×1 tracking pixel to the email body', () => {
        const html = '<p>Hello</p></body>';
        const result = service.injectTracking(html, 123);
        expect(result).toContain('api/email/track/open/123');
        expect(result).toContain('width="1" height="1"');
    });

    it('wraps absolute http links with click-tracking URLs', () => {
        const html = '<a href="https://example.com/buy">Buy Now</a></body>';
        const result = service.injectTracking(html, 456);
        expect(result).toContain('api/email/track/click/456');
        expect(result).toContain(encodeURIComponent('https://example.com/buy'));
    });

    it('appends pixel at end of body when no </body> tag present', () => {
        const html = '<p>Plain HTML</p>';
        const result = service.injectTracking(html, 789);
        expect(result.endsWith('>')).toBe(true);
        expect(result).toContain('api/email/track/open/789');
    });
});
