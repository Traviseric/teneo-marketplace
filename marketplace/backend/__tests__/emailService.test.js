'use strict';

/**
 * Tests for marketplace/backend/services/emailService.js
 *
 * Nodemailer is mocked so no real emails are sent.
 * The EmailService singleton's transporter is overridden in beforeEach
 * to inject a jest mock, isolating each test.
 *
 * Covers:
 *   - sendDownloadEmail()
 *   - sendOrderConfirmation()
 *   - sendEmail()
 *   - Transporter-not-configured fallback (all methods)
 */

// Mock nodemailer before any require so the EmailService constructor
// never opens a real SMTP connection.
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: '<mock@test>', response: '250 OK' }),
  })),
}));

const emailService = require('../services/emailService');

// ---------------------------------------------------------------------------
// Shared setup — inject a fresh mock transporter before each test
// ---------------------------------------------------------------------------

let mockSendMail;

beforeEach(() => {
  mockSendMail = jest.fn().mockResolvedValue({ messageId: '<mock@test>', response: '250 OK' });
  emailService.transporter = { sendMail: mockSendMail };
});

afterEach(() => {
  emailService.transporter = null;
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

  it('calls sendMail once', async () => {
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

  it('returns { success: false } when transporter is not configured', async () => {
    emailService.transporter = null;
    const result = await emailService.sendDownloadEmail(validData);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
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

  it('returns { success: false } when transporter is not configured', async () => {
    emailService.transporter = null;
    const result = await emailService.sendOrderConfirmation(orderData);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
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

  it('returns { success: false } when transporter is not configured', async () => {
    emailService.transporter = null;
    const result = await emailService.sendEmail({
      to: 'x@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });
});
