'use strict';

/**
 * Tests for marketplace/backend/routes/checkout.js (Stripe payment route)
 *
 * All external dependencies are mocked to avoid:
 *   - sqlite3 native binding errors on Windows
 *   - live Stripe API calls
 *   - filesystem reads for brand catalogs
 */

const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// ─── Mock heavy dependencies before requiring the router ─────────────────────

// Capture OrderService instance created at module load time (must be prefixed "mock" for jest hoist)
let mockOrderServiceInstance;

jest.mock('stripe', () => {
  const mockSession = {
    id: 'cs_test_session123',
    url: 'https://checkout.stripe.com/pay/cs_test_session123',
    metadata: {
      bookId: 'test-book',
      bookTitle: 'Test Book',
      bookAuthor: 'Test Author',
      userEmail: 'buyer@test.com',
      orderId: 'order_123_test-book',
      format: 'ebook',
      brandId: '',
      couponCode: '',
      couponDiscount: '',
      funnelId: '',
      funnelSessionId: '',
      courseSlug: '',
      product_type: '',
      referralCode: '',
    },
    amount_total: 1499,
    currency: 'usd',
    customer_email: 'buyer@test.com',
    line_items: { data: [{ description: 'Test Book - ebook', quantity: 1, amount_total: 1499 }] },
  };

  const mockStripe = {
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue(mockSession),
        retrieve: jest.fn().mockResolvedValue(mockSession),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    balance: {
      retrieve: jest.fn().mockResolvedValue({}),
    },
  };

  return jest.fn().mockReturnValue(mockStripe);
});

jest.mock('../services/databaseHelper', () => ({
  dbRun: jest.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
  dbGet: jest.fn().mockResolvedValue(null),
  dbAll: jest.fn().mockResolvedValue([]),
}));

jest.mock('../database/database', () => ({
  run: jest.fn((sql, params, cb) => { if (cb) cb(null); }),
  get: jest.fn((sql, params, cb) => { if (cb) cb(null, null); }),
  all: jest.fn((sql, params, cb) => { if (cb) cb(null, []); }),
}));

jest.mock('../services/orderService', () =>
  jest.fn().mockImplementation(() => {
    mockOrderServiceInstance = {
      createOrder: jest.fn().mockResolvedValue({}),
      getOrder: jest.fn().mockResolvedValue(null),
      getOrderBySessionId: jest.fn().mockResolvedValue(null),
      completeOrder: jest.fn().mockResolvedValue({ downloadToken: 'tok-test-123' }),
      updateOrderStatus: jest.fn().mockResolvedValue({}),
      updateOrderState: jest.fn().mockResolvedValue({}),
      isEventProcessed: jest.fn().mockResolvedValue(false),
      logPaymentEvent: jest.fn().mockResolvedValue({}),
      markEventProcessed: jest.fn().mockResolvedValue({}),
      failOrder: jest.fn().mockResolvedValue({}),
    };
    return mockOrderServiceInstance;
  })
);

jest.mock('../services/emailService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue({ success: true }),
  sendDownloadEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../services/stripeHealthService', () => ({
  checkStripeHealth: jest.fn().mockResolvedValue({ healthy: true }),
}));

jest.mock('../services/couponService', () => ({
  validateCoupon: jest.fn().mockResolvedValue({ valid: false }),
}));

jest.mock('../services/orderBumpService', () => ({
  getBumpForProduct: jest.fn().mockResolvedValue(null),
  getBumpById: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/btcpayService', () => ({
  createInvoice: jest.fn().mockRejectedValue(new Error('BTCPay not configured')),
  verifyWebhookSignature: jest.fn().mockReturnValue(false),
}));

jest.mock('../services/arxmintService', () => ({
  createCheckout: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/nftService', () => ({
  mintNFT: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/shippingService', () => ({
  calculateShipping: jest.fn().mockResolvedValue({ cost: 0 }),
}));

jest.mock('../services/downloadService', () => ({
  generateDownloadToken: jest.fn().mockResolvedValue({ downloadUrl: '/download/tok-123', token: 'tok-123' }),
}));

jest.mock('../services/licenseKeyService', () => ({
  generateLicenseKey: jest.fn().mockResolvedValue('LICENSE-TEST-KEY'),
}));

jest.mock('../services/storeBuildService', () => ({
  updateStatus: jest.fn().mockResolvedValue({}),
}));

jest.mock('../services/checkoutOfferService', () => ({
  sanitizeBrandId: jest.fn(id => id || null),
  lookupBookPrice: jest.fn().mockReturnValue(14.99),
  applyCouponToPrice: jest.fn((price, code) => ({
    basePrice: price,
    finalPrice: price,
    discountAmount: 0,
    couponCode: null,
    applied: false,
  })),
  getNextReadOffer: jest.fn().mockReturnValue(null),
  resolveCatalogItem: jest.fn().mockReturnValue(null),
}));

jest.mock('../routes/checkoutMixed', () => ({
  processMixedOrder: jest.fn().mockResolvedValue({}),
}));

jest.mock('../routes/courseRoutes', () => ({
  enrollUserInCourse: jest.fn().mockResolvedValue({}),
}));

jest.mock('../routes/referralRoutes', () => ({
  trackReferral: jest.fn().mockResolvedValue({}),
}));

// ─── App factory ──────────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  // Webhook route needs raw body — mount before json parser
  app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());

  // Session stub (checkout.js reads req.session.referralCode)
  app.use((req, _res, next) => {
    req.session = {};
    next();
  });

  const checkoutRouter = require('../routes/checkout');
  app.use('/api/checkout', checkoutRouter);
  return app;
}

// Persist and restore NODE_ENV so tests don't bleed into each other
let savedNodeEnv;
beforeAll(() => {
  savedNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
});
afterAll(() => {
  process.env.NODE_ENV = savedNodeEnv;
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

// ─── POST /api/checkout/create-session ───────────────────────────────────────

describe('POST /api/checkout/create-session — happy path', () => {
  let app;
  const stripeHealthService = require('../services/stripeHealthService');
  const checkoutOfferService = require('../services/checkoutOfferService');

  beforeEach(() => {
    jest.clearAllMocks();
    stripeHealthService.checkStripeHealth.mockResolvedValue({ healthy: true });
    checkoutOfferService.lookupBookPrice.mockReturnValue(14.99);
    app = buildApp();
  });

  it('returns 200 with checkoutUrl and sessionId on valid request', async () => {
    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'test-book',
        format: 'ebook',
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        userEmail: 'buyer@test.com',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('checkoutUrl');
    expect(res.body).toHaveProperty('sessionId', 'cs_test_session123');
    expect(res.body).toHaveProperty('orderId');
    expect(res.body).toHaveProperty('pricing');
  });

  it('creates an order record in the database', async () => {
    await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'test-book',
        format: 'ebook',
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        userEmail: 'buyer@test.com',
      });

    expect(mockOrderServiceInstance.createOrder).toHaveBeenCalledTimes(1);
    expect(mockOrderServiceInstance.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'buyer@test.com',
        bookId: 'test-book',
        format: 'ebook',
      })
    );
  });
});

describe('POST /api/checkout/create-session — validation', () => {
  let app;
  const stripeHealthService = require('../services/stripeHealthService');

  beforeEach(() => {
    jest.clearAllMocks();
    stripeHealthService.checkStripeHealth.mockResolvedValue({ healthy: true });
    app = buildApp();
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({ bookId: 'test-book' }); // missing format, bookTitle, etc.

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  it('returns 400 when format is not in the allowlist', async () => {
    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'test-book',
        format: 'mp3', // invalid format
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        userEmail: 'buyer@test.com',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid format/i);
  });

  it('returns 400 when product is not found in catalog', async () => {
    const checkoutOfferService = require('../services/checkoutOfferService');
    checkoutOfferService.lookupBookPrice.mockReturnValue(null);

    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'nonexistent-book',
        format: 'ebook',
        bookTitle: 'No Book',
        bookAuthor: 'Nobody',
        userEmail: 'buyer@test.com',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found in catalog/i);
  });

  it('returns 503 with stripeDown flag when Stripe is unavailable', async () => {
    stripeHealthService.checkStripeHealth.mockResolvedValue({ healthy: false });

    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'test-book',
        format: 'ebook',
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        userEmail: 'buyer@test.com',
      });

    expect(res.status).toBe(503);
    expect(res.body.stripeDown).toBe(true);
    expect(res.body).toHaveProperty('fallbackUrl');
  });
});

describe('POST /api/checkout/create-session — coupon code', () => {
  let app;
  const stripeHealthService = require('../services/stripeHealthService');
  const couponService = require('../services/couponService');
  const checkoutOfferService = require('../services/checkoutOfferService');

  beforeEach(() => {
    jest.clearAllMocks();
    stripeHealthService.checkStripeHealth.mockResolvedValue({ healthy: true });
    checkoutOfferService.lookupBookPrice.mockReturnValue(14.99);
    app = buildApp();
  });

  it('applies coupon discount when valid coupon code is provided', async () => {
    couponService.validateCoupon.mockResolvedValue({
      valid: true,
      code: 'SAVE10',
      discountAmount: 1.50,
    });

    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'test-book',
        format: 'ebook',
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        userEmail: 'buyer@test.com',
        couponCode: 'SAVE10',
      });

    expect(res.status).toBe(200);
    expect(res.body.pricing.discountAmount).toBe(1.5);
    expect(res.body.pricing.couponCode).toBe('SAVE10');
  });

  it('proceeds at full price when coupon is invalid', async () => {
    couponService.validateCoupon.mockResolvedValue({ valid: false });

    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'test-book',
        format: 'ebook',
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        userEmail: 'buyer@test.com',
        couponCode: 'BADCODE',
      });

    expect(res.status).toBe(200);
    expect(res.body.pricing.discountAmount).toBe(0);
    expect(res.body.pricing.finalPrice).toBe(14.99);
  });
});

describe('POST /api/checkout/create-session — order bump', () => {
  let app;
  const stripeHealthService = require('../services/stripeHealthService');
  const orderBumpService = require('../services/orderBumpService');
  const checkoutOfferService = require('../services/checkoutOfferService');
  const stripe = require('stripe')();

  beforeEach(() => {
    jest.clearAllMocks();
    stripeHealthService.checkStripeHealth.mockResolvedValue({ healthy: true });
    checkoutOfferService.lookupBookPrice.mockReturnValue(14.99);
    app = buildApp();
  });

  it('includes bump line item in Stripe session when bumpAccepted is true', async () => {
    orderBumpService.getBumpForProduct.mockResolvedValue({
      bump_product_name: 'Bonus Book',
      bump_description: 'A bonus addition',
      bump_price: 9.99,
    });

    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'test-book',
        format: 'ebook',
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        userEmail: 'buyer@test.com',
        bumpAccepted: true,
      });

    expect(res.status).toBe(200);
    // Stripe sessions.create should have been called with 2 line items
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              product_data: expect.objectContaining({ name: 'Test Book - ebook' }),
            }),
          }),
          expect.objectContaining({
            price_data: expect.objectContaining({
              product_data: expect.objectContaining({ name: 'Bonus Book' }),
            }),
          }),
        ]),
      })
    );
  });

  it('does not add bump when bumpAccepted is false', async () => {
    const res = await request(app)
      .post('/api/checkout/create-session')
      .send({
        bookId: 'test-book',
        format: 'ebook',
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        userEmail: 'buyer@test.com',
        bumpAccepted: false,
      });

    expect(res.status).toBe(200);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              product_data: expect.objectContaining({ name: 'Test Book - ebook' }),
            }),
          }),
        ]),
      })
    );
    // Should only have 1 line item (no bump)
    const callArgs = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(callArgs.line_items).toHaveLength(1);
  });
});

// ─── POST /api/checkout/webhook ───────────────────────────────────────────────

describe('POST /api/checkout/webhook — Stripe webhook handler', () => {
  let app;
  const stripe = require('stripe')();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
    app = buildApp();
  });

  it('returns 400 when Stripe signature verification fails', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      const err = new Error('Invalid signature');
      err.type = 'StripeSignatureVerificationError';
      throw err;
    });

    const res = await request(app)
      .post('/api/checkout/webhook')
      .set('stripe-signature', 'bad-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({ type: 'checkout.session.completed' })));

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Webhook Error/i);
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const appNoSecret = buildApp();

    const res = await request(appNoSecret)
      .post('/api/checkout/webhook')
      .set('stripe-signature', 'any-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({})));

    expect(res.status).toBe(500);
    // Restore for subsequent tests
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
  });

  it('returns 200 with received:true for checkout.session.completed event', async () => {
    const mockEvent = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session123',
          metadata: {
            bookId: 'test-book',
            bookTitle: 'Test Book',
            bookAuthor: 'Test Author',
            userEmail: 'buyer@test.com',
            orderId: 'order_123_test-book',
            format: 'ebook',
          },
          customer_email: 'buyer@test.com',
          amount_total: 1499,
          currency: 'usd',
        },
      },
    };

    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
    mockOrderServiceInstance.isEventProcessed.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/checkout/webhook')
      .set('stripe-signature', 'valid-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify(mockEvent)));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received', true);
  });

  it('skips duplicate events (idempotency)', async () => {
    const mockEvent = {
      id: 'evt_already_processed',
      type: 'checkout.session.completed',
      data: { object: { metadata: {}, id: 'cs_test' } },
    };

    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
    mockOrderServiceInstance.isEventProcessed.mockResolvedValue(true); // already processed

    const res = await request(app)
      .post('/api/checkout/webhook')
      .set('stripe-signature', 'valid-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify(mockEvent)));

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
  });
});

// ─── GET /api/checkout/session/:sessionId ────────────────────────────────────

describe('GET /api/checkout/session/:sessionId', () => {
  let app;
  const stripe = require('stripe')();

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('returns 400 for session IDs that do not start with cs_', async () => {
    const res = await request(app).get('/api/checkout/session/invalid-id');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid session/i);
  });

  it('returns session details for a valid cs_ session ID', async () => {
    const res = await request(app).get('/api/checkout/session/cs_test_session123');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test_session123', expect.any(Object));
  });
});
