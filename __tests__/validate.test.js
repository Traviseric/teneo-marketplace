/**
 * Unit tests for isValidEmail() utility.
 */
const { isValidEmail } = require('../marketplace/backend/utils/validate');

describe('isValidEmail()', () => {
    // Valid addresses
    it('accepts a standard email address', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('accepts email with subdomain', () => {
        expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
    });

    it('accepts email with plus tag', () => {
        expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('accepts email with dots in local part', () => {
        expect(isValidEmail('first.last@example.com')).toBe(true);
    });

    // Invalid addresses
    it('rejects missing @', () => {
        expect(isValidEmail('notanemail')).toBe(false);
    });

    it('rejects double @', () => {
        expect(isValidEmail('user@@example.com')).toBe(false);
    });

    it('rejects missing local part', () => {
        expect(isValidEmail('@example.com')).toBe(false);
    });

    it('rejects missing domain', () => {
        expect(isValidEmail('user@')).toBe(false);
    });

    it('rejects non-string values', () => {
        expect(isValidEmail(null)).toBe(false);
        expect(isValidEmail(undefined)).toBe(false);
        expect(isValidEmail(123)).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isValidEmail('')).toBe(false);
    });

    it('rejects domain starting with dot', () => {
        expect(isValidEmail('user@.com')).toBe(false);
    });
});
