/**
 * Tests for LuluService POD (Print-on-Demand) sandbox operations.
 * Uses jest.mock to intercept axios calls so no real HTTP requests are made.
 */

const mockAxiosPost = jest.fn();
const mockAxiosGet = jest.fn();

jest.mock('axios', () => ({
    post: mockAxiosPost,
    get: mockAxiosGet,
}));

// Mock sqlite3 — LuluService opens its own DB connection
jest.mock('sqlite3', () => ({
    verbose: () => ({
        Database: jest.fn().mockImplementation(() => ({
            get: jest.fn(),
            run: jest.fn(),
            close: jest.fn(),
        })),
    }),
}));

const LuluService = require('../marketplace/backend/services/luluService');

// Shared valid token response
const TOKEN_RESPONSE = {
    data: { access_token: 'test_bearer_token_xyz', expires_in: 3600 },
};

// Sample order data
const SAMPLE_ORDER = {
    lineItems: [
        {
            bookId: 'book-001',
            formatType: 'hardcover',
            quantity: 1,
            title: 'Sample Book',
        },
    ],
    shippingAddress: {
        name: 'Jane Doe',
        street1: '123 Main St',
        city: 'Austin',
        state: 'TX',
        country: 'US',
        zip: '78701',
        phone: '555-0100',
    },
    shippingMethod: 'MAIL',
    contactEmail: 'jane@example.com',
    externalId: 'ext_order_001',
};

const SAMPLE_LINE_ITEMS = [
    { page_count: 200, pod_package_id: '0600X0900BWSTDPB060UW444MNG', quantity: 1 },
];

const SAMPLE_SHIPPING_ADDRESS = {
    name: 'Jane Doe',
    street1: '123 Main St',
    city: 'Austin',
    state: 'TX',
    country: 'US',
    zip: '78701',
};

beforeEach(() => {
    jest.clearAllMocks();
    // Default: token auth always succeeds
    mockAxiosPost.mockResolvedValueOnce(TOKEN_RESPONSE);
});

describe('Lulu POD Sandbox — createPrintJob()', () => {
    test('constructs correct Lulu API payload for a new book (no existing printable_id)', async () => {
        // getBookFormat returns format info without a printable_id
        const service = new LuluService();
        service.getBookFormat = jest.fn().mockResolvedValue({
            printable_id: null,
            cover_url: 'https://cdn.example.com/cover.pdf',
            interior_url: 'https://cdn.example.com/interior.pdf',
            pod_package_id: '0600X0900BWSTDPB060UW444MNG',
        });

        const mockPrintJobResponse = {
            data: {
                id: 'pj_test_001',
                order_id: { id: 'ord_test_001' },
                status: { name: 'CREATED' },
                total_cost_incl_tax: '12.50',
                estimated_shipping_dates: { min: '2026-03-05', max: '2026-03-10' },
                line_items: [],
            },
        };
        mockAxiosPost.mockResolvedValueOnce(mockPrintJobResponse);

        const result = await service.createPrintJob(SAMPLE_ORDER);

        expect(result.success).toBe(true);
        expect(result.printJobId).toBe('pj_test_001');
        expect(result.status).toBe('CREATED');

        // Verify payload shape sent to Lulu API
        const printJobCall = mockAxiosPost.mock.calls[1]; // calls[0] = auth token
        const payload = printJobCall[1];
        expect(payload.shipping_level).toBe('MAIL');
        expect(payload.external_id).toBe('ext_order_001');
        expect(payload.shipping_address.name).toBe('Jane Doe');
        expect(payload.line_items[0]).toMatchObject({
            title: 'Sample Book',
            cover: 'https://cdn.example.com/cover.pdf',
            interior: 'https://cdn.example.com/interior.pdf',
            pod_package_id: '0600X0900BWSTDPB060UW444MNG',
            quantity: 1,
        });
    });

    test('uses printable_id when available to speed up processing', async () => {
        const service = new LuluService();
        service.getBookFormat = jest.fn().mockResolvedValue({
            printable_id: 'existing_printable_123',
        });

        mockAxiosPost.mockResolvedValueOnce({
            data: {
                id: 'pj_test_002',
                order_id: { id: 'ord_002' },
                status: { name: 'CREATED' },
                total_cost_incl_tax: '12.50',
                estimated_shipping_dates: {},
                line_items: [],
            },
        });

        await service.createPrintJob(SAMPLE_ORDER);

        const payload = mockAxiosPost.mock.calls[1][1];
        expect(payload.line_items[0]).toMatchObject({
            printable_id: 'existing_printable_123',
            quantity: 1,
        });
        // Should NOT include cover/interior URLs when using existing printable
        expect(payload.line_items[0].cover).toBeUndefined();
    });

    test('returns success:false with error message when Lulu API fails', async () => {
        const service = new LuluService();
        service.getBookFormat = jest.fn().mockResolvedValue({ printable_id: null, cover_url: '', interior_url: '', pod_package_id: '' });

        mockAxiosPost.mockRejectedValueOnce({
            response: { data: { errors: [{ detail: 'Invalid pod_package_id' }] } },
        });

        const result = await service.createPrintJob(SAMPLE_ORDER);

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Invalid pod_package_id|Failed to create print job/);
    });
});

describe('Lulu POD Sandbox — getShippingOptions()', () => {
    test('returns sorted shipping options for a given address and format', async () => {
        const mockShippingResponse = {
            data: {
                shipping_options: [
                    { level: 'PRIORITY_MAIL', total_cost_incl_tax: '18.50' },
                    { level: 'MAIL', total_cost_incl_tax: '8.25' },
                    { level: 'EXPRESS_MAIL', total_cost_incl_tax: '28.00' },
                ],
            },
        };
        mockAxiosPost.mockResolvedValueOnce(mockShippingResponse);

        const service = new LuluService();
        const result = await service.getShippingOptions(SAMPLE_LINE_ITEMS, SAMPLE_SHIPPING_ADDRESS);

        expect(result.success).toBe(true);
        expect(result.options).toHaveLength(3);
        // Options should be sorted by cost ascending
        const costs = result.options.map(o => parseFloat(o.cost));
        expect(costs[0]).toBeLessThanOrEqual(costs[1]);
        expect(costs[1]).toBeLessThanOrEqual(costs[2]);
    });

    test('returns success:false when shipping options request fails', async () => {
        mockAxiosPost.mockRejectedValueOnce(new Error('Network error'));

        const service = new LuluService();
        const result = await service.getShippingOptions(SAMPLE_LINE_ITEMS, SAMPLE_SHIPPING_ADDRESS);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    test('constructs correct shipping_address payload', async () => {
        mockAxiosPost.mockResolvedValueOnce({
            data: { shipping_options: [{ level: 'MAIL', total_cost_incl_tax: '8.25' }] },
        });

        const service = new LuluService();
        await service.getShippingOptions(SAMPLE_LINE_ITEMS, SAMPLE_SHIPPING_ADDRESS);

        const shippingCall = mockAxiosPost.mock.calls[1]; // calls[0] = auth
        const payload = shippingCall[1];
        expect(payload.shipping_address.name).toBe('Jane Doe');
        expect(payload.shipping_address.city).toBe('Austin');
        expect(payload.shipping_address.country_code).toBe('US');
        expect(payload.shipping_address.postcode).toBe('78701');
    });
});

describe('Lulu POD Sandbox — getPrintJobStatus()', () => {
    test('returns status for an existing print job', async () => {
        mockAxiosGet.mockResolvedValueOnce({
            data: {
                status: { name: 'IN_PRODUCTION' },
                tracking_urls: ['https://track.usps.com/abc123'],
                tracking_id: 'USPS123',
                shipped_at: null,
                estimated_arrival_date: '2026-03-08',
            },
        });

        const service = new LuluService();
        const result = await service.getPrintJobStatus('pj_test_001');

        expect(result.success).toBe(true);
        expect(result.status).toBe('IN_PRODUCTION');
        expect(result.trackingUrl).toBe('https://track.usps.com/abc123');
        expect(result.trackingId).toBe('USPS123');
    });

    test('returns success:false when job ID does not exist', async () => {
        mockAxiosGet.mockRejectedValueOnce({
            response: { data: { detail: 'Not found' } },
        });

        const service = new LuluService();
        const result = await service.getPrintJobStatus('nonexistent_pj');

        expect(result.success).toBe(false);
    });

    test('calls correct Lulu API endpoint with the print job ID', async () => {
        mockAxiosGet.mockResolvedValueOnce({
            data: {
                status: { name: 'SHIPPED' },
                tracking_urls: [],
                tracking_id: null,
                shipped_at: '2026-03-02T10:00:00Z',
                estimated_arrival_date: '2026-03-06',
            },
        });

        const service = new LuluService();
        await service.getPrintJobStatus('pj_specific_id');

        const getCall = mockAxiosGet.mock.calls[0];
        const url = getCall[0];
        expect(url).toContain('pj_specific_id');
        expect(url).toContain('print-jobs');
    });
});
