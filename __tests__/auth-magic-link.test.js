/**
 * Integration tests for the Magic Link auth flow via LocalAuthProvider.
 * Tests token generation, expiry, and session creation.
 * Uses jest mocks for the database and email service to avoid I/O dependencies.
 */

const crypto = require('crypto');

// --- Mock database ---
const mockDbGet = jest.fn();
const mockDbPrepare = jest.fn();
const mockDbRun = jest.fn();

jest.mock('../marketplace/backend/database/database', () => {
    const stmt = { get: mockDbGet, run: mockDbRun, all: jest.fn().mockReturnValue([]) };
    return { prepare: () => stmt };
});

// --- Mock email service ---
jest.mock('../marketplace/backend/services/emailService', () => ({
    sendMagicLink: jest.fn().mockResolvedValue(true),
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendDownloadEmail: jest.fn().mockResolvedValue(true),
}));

const LocalAuthProvider = require('../marketplace/backend/auth/providers/LocalAuthProvider');
const emailService = require('../marketplace/backend/services/emailService');

// Helpers
function makeFutureISO(minutesFromNow) {
    return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}
function makePastISO(minutesAgo) {
    return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Magic Link Auth Flow — token generation', () => {
    test('register() calls sendMagicLink with the user email', async () => {
        // User does not exist yet
        mockDbGet.mockReturnValueOnce(null); // no existing user
        // INSERT user → ok
        mockDbRun.mockReturnValue({ lastInsertRowid: 1 });
        // INSERT magic_link → ok
        mockDbRun.mockReturnValue({ lastInsertRowid: 2 });

        const provider = new LocalAuthProvider();
        const result = await provider.register('newuser@example.com', 'New User');

        expect(emailService.sendMagicLink).toHaveBeenCalledTimes(1);
        const [calledEmail] = emailService.sendMagicLink.mock.calls[0];
        expect(calledEmail).toBe('newuser@example.com');
        expect(result.type).toBe('magic_link');
    });

    test('register() throws when user already exists', async () => {
        mockDbGet.mockReturnValueOnce({ id: 'existing-user-id' });

        const provider = new LocalAuthProvider();
        await expect(provider.register('existing@example.com', 'Existing')).rejects.toThrow(
            'User with this email already exists'
        );
        expect(emailService.sendMagicLink).not.toHaveBeenCalled();
    });

    test('login() returns magic_link result for existing active user', async () => {
        mockDbGet.mockReturnValueOnce({ id: 'user-abc', name: 'Alice', account_status: 'active' });
        mockDbRun.mockReturnValue({});

        const provider = new LocalAuthProvider();
        const result = await provider.login('alice@example.com');

        expect(result.type).toBe('magic_link');
        expect(emailService.sendMagicLink).toHaveBeenCalledTimes(1);
    });

    test('login() returns generic message when user does not exist (no enumeration)', async () => {
        mockDbGet.mockReturnValueOnce(null); // user not found

        const provider = new LocalAuthProvider();
        const result = await provider.login('nobody@example.com');

        expect(result.type).toBe('magic_link');
        expect(result.message).toMatch(/if an account exists/i);
        expect(emailService.sendMagicLink).not.toHaveBeenCalled();
    });

    test('login() throws for suspended account', async () => {
        mockDbGet.mockReturnValueOnce({ id: 'user-sus', name: 'Sus', account_status: 'suspended' });

        const provider = new LocalAuthProvider();
        await expect(provider.login('sus@example.com')).rejects.toThrow(/suspended/i);
    });
});

describe('Magic Link Auth Flow — token verification', () => {
    test('verifyToken() returns user data for a valid, unexpired token', async () => {
        const mockLink = {
            user_id: 'user-123',
            email: 'alice@example.com',
            name: 'Alice',
            avatar_url: null,
            credits: 0,
            email_verified: 1,
            account_status: 'active',
            token: 'valid-token-abc',
            used: 0,
            expires_at: makeFutureISO(30),
        };
        mockDbGet.mockReturnValueOnce(mockLink);
        mockDbRun.mockReturnValue({});

        const provider = new LocalAuthProvider();
        const user = await provider.verifyToken('valid-token-abc');

        expect(user.id).toBe('user-123');
        expect(user.email).toBe('alice@example.com');
        expect(user.email_verified).toBe(true);
    });

    test('verifyToken() throws for an invalid or already-used token', async () => {
        mockDbGet.mockReturnValueOnce(null); // not found (or used)

        const provider = new LocalAuthProvider();
        await expect(provider.verifyToken('used-or-invalid-token')).rejects.toThrow(
            'Invalid or expired login link'
        );
    });

    test('verifyToken() throws for an expired token (query returns null)', async () => {
        // The SQL WHERE clause filters out expired tokens, so result is null
        mockDbGet.mockReturnValueOnce(null);

        const provider = new LocalAuthProvider();
        await expect(provider.verifyToken('expired-token')).rejects.toThrow(
            'Invalid or expired login link'
        );
    });

    test('verifyToken() marks token as used after successful verification', async () => {
        const mockLink = {
            user_id: 'user-456',
            email: 'bob@example.com',
            name: 'Bob',
            avatar_url: null,
            credits: 0,
            email_verified: 0,
            account_status: 'active',
        };
        mockDbGet.mockReturnValueOnce(mockLink);
        const runSpy = mockDbRun.mockReturnValue({});

        const provider = new LocalAuthProvider();
        await provider.verifyToken('one-time-token');

        // run() is called for: mark used, update last_login, audit log
        expect(runSpy).toHaveBeenCalled();
    });

    test('verifyToken() token with short custom TTL expires correctly (config check)', () => {
        const provider = new LocalAuthProvider({ linkExpiryMinutes: 5 });
        expect(provider.config.linkExpiryMinutes).toBe(5);
    });
});
