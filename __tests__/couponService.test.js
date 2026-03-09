/**
 * Tests for couponService — DB-backed coupon validation with expiry and usage limits.
 */
jest.mock('../marketplace/backend/database/database', () => {
    // Simple in-memory store for test coupons
    const rows = [];
    let nextId = 1;

    return {
        get: jest.fn(async (sql, params) => {
            const code = params[0];
            return rows.find(r => r.code === code && r.active === 1) || undefined;
        }),
        run: jest.fn(async (sql, params) => {
            if (/INSERT INTO coupons/i.test(sql)) {
                const [code, type, amount, expires_at, max_uses] = params;
                rows.push({ id: nextId, code, type, amount, expires_at: expires_at || null, max_uses: max_uses || null, used_count: 0, active: 1 });
                return { lastID: nextId++ };
            }
            if (/UPDATE coupons SET used_count/i.test(sql)) {
                const code = params[0];
                const row = rows.find(r => r.code === code && r.active === 1);
                if (row) row.used_count += 1;
                return { changes: row ? 1 : 0 };
            }
            if (/UPDATE coupons SET active = 0/i.test(sql)) {
                const id = params[0];
                const row = rows.find(r => r.id === Number(id));
                if (row) row.active = 0;
                return { changes: row ? 1 : 0 };
            }
            return { changes: 0 };
        }),
        all: jest.fn(async () => rows.slice()),
        // Expose rows for test reset
        __rows: rows,
        __resetRows: () => { rows.length = 0; nextId = 1; },
    };
});

const db = require('../marketplace/backend/database/database');
const {
    validateCoupon,
    applyCoupon,
    createCoupon,
    listCoupons,
    deactivateCoupon,
} = require('../marketplace/backend/services/couponService');

beforeEach(() => {
    db.__resetRows();
    jest.clearAllMocks();
});

describe('validateCoupon() — static fallback', () => {
    it('returns { valid: false } for unknown code', async () => {
        const result = await validateCoupon('NOTREAL', 100);
        expect(result.valid).toBe(false);
    });

    it('validates SAVE10 via static fallback', async () => {
        const result = await validateCoupon('SAVE10', 100);
        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(10);
        expect(result.source).toBe('static');
    });

    it('validates 10OFF fixed discount via static fallback', async () => {
        const result = await validateCoupon('10OFF', 50);
        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(10);
    });

    it('caps fixed discount at cart total', async () => {
        const result = await validateCoupon('10OFF', 5);
        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(5);
    });

    it('is case-insensitive', async () => {
        const result = await validateCoupon('save10', 100);
        expect(result.valid).toBe(true);
        expect(result.code).toBe('SAVE10');
    });

    it('returns { valid: false, message } when code arg is missing', async () => {
        const result = await validateCoupon(null, 100);
        expect(result.valid).toBe(false);
        expect(result.message).toBeDefined();
    });
});

describe('validateCoupon() — DB coupons', () => {
    it('validates a DB percentage coupon', async () => {
        await createCoupon({ code: 'DBTEST20', type: 'percentage', amount: 20 });
        const result = await validateCoupon('DBTEST20', 100);
        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(20);
        expect(result.source).toBe('db');
    });

    it('validates a DB fixed coupon', async () => {
        await createCoupon({ code: 'FIXED5', type: 'fixed', amount: 5 });
        const result = await validateCoupon('FIXED5', 50);
        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(5);
    });

    it('rejects an expired DB coupon', async () => {
        await createCoupon({ code: 'EXPIRED', type: 'percentage', amount: 10, expires_at: '2020-01-01T00:00:00' });
        const result = await validateCoupon('EXPIRED', 100);
        expect(result.valid).toBe(false);
        expect(result.message).toMatch(/expired/i);
    });

    it('rejects a DB coupon that has hit max_uses', async () => {
        await createCoupon({ code: 'MAXED', type: 'percentage', amount: 10, max_uses: 2 });
        // Simulate 2 uses
        const rows = db.__rows;
        const row = rows.find(r => r.code === 'MAXED');
        row.used_count = 2;

        const result = await validateCoupon('MAXED', 100);
        expect(result.valid).toBe(false);
        expect(result.message).toMatch(/limit/i);
    });

    it('accepts a DB coupon still within max_uses', async () => {
        await createCoupon({ code: 'NOTMAXED', type: 'percentage', amount: 10, max_uses: 5 });
        const result = await validateCoupon('NOTMAXED', 100);
        expect(result.valid).toBe(true);
    });
});

describe('applyCoupon()', () => {
    it('increments used_count for a DB coupon', async () => {
        await createCoupon({ code: 'APPLYTEST', type: 'percentage', amount: 10 });
        await applyCoupon('APPLYTEST');
        expect(db.run).toHaveBeenCalledWith(
            expect.stringContaining('used_count'),
            ['APPLYTEST']
        );
    });

    it('is a no-op for missing code', async () => {
        await expect(applyCoupon(null)).resolves.toBeUndefined();
    });
});

describe('createCoupon()', () => {
    it('creates a coupon and returns id + code', async () => {
        const result = await createCoupon({ code: 'new25', type: 'percentage', amount: 25 });
        expect(result.id).toBeDefined();
        expect(result.code).toBe('NEW25'); // uppercased
    });

    it('throws when required fields are missing', async () => {
        await expect(createCoupon({ code: 'X' })).rejects.toThrow();
    });

    it('throws for invalid type', async () => {
        await expect(createCoupon({ code: 'X', type: 'bogus', amount: 5 })).rejects.toThrow(/type/i);
    });
});

describe('listCoupons()', () => {
    it('returns all coupons', async () => {
        await createCoupon({ code: 'A', type: 'fixed', amount: 5 });
        await createCoupon({ code: 'B', type: 'percentage', amount: 10 });
        const list = await listCoupons();
        expect(list.length).toBe(2);
    });
});

describe('deactivateCoupon()', () => {
    it('sets active = 0', async () => {
        await createCoupon({ code: 'DEACT', type: 'fixed', amount: 1 });
        const row = db.__rows.find(r => r.code === 'DEACT');
        await deactivateCoupon(row.id);
        expect(db.run).toHaveBeenCalledWith(
            expect.stringContaining('active = 0'),
            [row.id]
        );
    });
});
