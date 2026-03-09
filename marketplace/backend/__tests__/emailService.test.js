'use strict';

/**
 * Tests for marketplace/backend/services/emailService.js
 *
 * Both nodemailer and resend are mocked so no real emails are sent.
 * The EmailService singleton's internals are overridden in beforeEach
 * to inject the relevant jest mock, isolating each test.
 *
 * Covers:
 *   - sendDownloadEmail()
 *   - sendOrderConfirmation()
 *   - sendEmail()
 *   - Nodemailer SMTP provider (injected transporter mock)
 *   - Resend API provider (injected _resend mock)
 *   - Transporter-not-configured fallback (all methods)
 */

// Mock nodemailer before any require so the EmailService constructor
// never opens a real SMTP connection.
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: '<mock@test>', response: '250 OK' }),
  })),
}));

// Mock resend so no real HTTP calls are made.
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'resend-mock-id' }, error: null }),
    },
  })),
}));

const emailService = require('../services/emailService');

// ---------------------------------------------------------------------------
// Shared setup — inject a fresh mock transporter (nodemailer path) before each test
// ---------------------------------------------------------------------------

let mockSendMail;

beforeEach(() => {
  mockSendMail = jest.fn().mockResolvedValue({ messageId: '<mock@test>', response: '250 OK' });
  // Simulate nodemailer provider
  emailService._provider = null;
  emailService._resend = null;
  emailService.transporter = { sendMail: mockSendMail };
});

afterEach(() => {
  emailService.transporter = null;
  emailService._provider = null;
  emailService._resend = null;
});

// ---------------------------------------------------------------------------
// sendDownloadEmail()
// ---------------------------------------------------------------------------

describe('sendDownloadEmail()', () => {
  const validData = {
    userEmail: 'customer@example.com',
    bookTitle: 'My Awesome Book',
    bookAuthor: 'Jane Doe',
    downloadUrl: 'https://example.com/download/tok123',
    orderId: 'ORD-001',
  };

  it('calls sendMail once (nodemailer path)', async () => {
    await emailService.sendDownloadEmail(validData);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('sends to the customer email address', async () => {
    await emailService.sendDownloadEmail(validData);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'customer@example.com' })
    );
  });

  it('includes the download URL in the HTML body', async () => {
    await emailService.sendDownloadEmail(validData);
    const { html } = mockSendMail.mock.calls[0][0];
    expect(html).toContain('https://example.com/download/tok123');
  });

  it('returns { success: true, messageId } on success', async () => {
    const result = await emailService.sendDownloadEmail(validData);
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('returns { success: false } when not configured', async () => {
    emailService.transporter = null;
    emailService._provider = null;
    const result = await emailService.sendDownloadEmail(validData);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });

  it('routes through Resend when _provider is resend', async () => {
    const mockResendSend = jest.fn().mockResolvedValue({ error: null });
    emailService.transporter = null;
    emailService._provider = 'resend';
    emailService._resend = { emails: { send: mockResendSend } };

    const result = await emailService.sendDownloadEmail(validData);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'customer@example.com', subject: expect.stringContaining('My Awesome Book') })
    );
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sendOrderConfirmation()
// ---------------------------------------------------------------------------

describe('sendOrderConfirmation()', () => {
  const orderData = {
    userEmail: 'buyer@example.com',
    bookTitle: 'Test Book',
    bookAuthor: 'Test Author',
    price: '29.99',
    orderId: 'ORD-002',
  };

  it('sends email to the correct recipient', async () => {
    await emailService.sendOrderConfirmation(orderData);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com' })
    );
  });

  it('includes "Order" in the subject line', async () => {
    await emailService.sendOrderConfirmation(orderData);
    const { subject } = mockSendMail.mock.calls[0][0];
    expect(subject).toMatch(/order/i);
  });

  it('returns { success: true } on success', async () => {
    const result = await emailService.sendOrderConfirmation(orderData);
    expect(result.success).toBe(true);
  });

  it('returns { success: false } when not configured', async () => {
    emailService.transporter = null;
    emailService._provider = null;
    const result = await emailService.sendOrderConfirmation(orderData);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });

  it('routes through Resend when _provider is resend', async () => {
    const mockResendSend = jest.fn().mockResolvedValue({ error: null });
    emailService.transporter = null;
    emailService._provider = 'resend';
    emailService._resend = { emails: { send: mockResendSend } };

    const result = await emailService.sendOrderConfirmation(orderData);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sendEmail() — generic low-level sender
// ---------------------------------------------------------------------------

describe('sendEmail()', () => {
  it('sends with the provided to/subject/html fields', async () => {
    await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Hello',
      html: '<p>World</p>',
    });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Hello',
        html: '<p>World</p>',
      })
    );
  });

  it('returns { success: true, messageId } on success', async () => {
    const result = await emailService.sendEmail({
      to: 'x@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('returns { success: false } when not configured', async () => {
    emailService.transporter = null;
    emailService._provider = null;
    const result = await emailService.sendEmail({
      to: 'x@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });

  it('routes through Resend when _provider is resend', async () => {
    const mockResendSend = jest.fn().mockResolvedValue({ error: null });
    emailService.transporter = null;
    emailService._provider = 'resend';
    emailService._resend = { emails: { send: mockResendSend } };

    const result = await emailService.sendEmail({
      to: 'resend-test@example.com',
      subject: 'Resend Test',
      html: '<p>Via Resend</p>',
    });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'resend-test@example.com',
        subject: 'Resend Test',
        html: '<p>Via Resend</p>',
      })
    );
    expect(result.success).toBe(true);
  });

  it('propagates Resend API errors as { success: false }', async () => {
    const mockResendSend = jest.fn().mockResolvedValue({ error: { message: 'invalid_api_key' } });
    emailService.transporter = null;
    emailService._provider = 'resend';
    emailService._resend = { emails: { send: mockResendSend } };

    const result = await emailService.sendEmail({
      to: 'x@example.com',
      subject: 'Err',
      html: '<p>Fail</p>',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid_api_key/);
  });
});
