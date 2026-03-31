# OpenBazaar.ai — Printful Fulfillment Provider Spec

## Goal
Add Printful as a pluggable fulfillment provider in OpenBazaar.ai so any merchant can connect their Printful store and sell physical merch (print-on-demand) through the platform. This is the key feature that makes OpenBazaar.ai a real e-commerce platform, not just a catalog.

## Context
- OpenBazaar.ai is **open source** — no private keys or secrets baked into the codebase
- Each merchant brings their own Printful API key + store ID
- Credentials stored encrypted in Supabase (per-merchant)
- Reference implementation: Glacier Ice Cream + ArxMint both use Printful dropshipping
- Shared package: `D:\Travis Eric\TE Code\packages\printful-client\src\` — has client, webhook, sync, types

## Architecture

### Fulfillment Provider Interface
```typescript
interface FulfillmentProvider {
  id: string;                    // "printful"
  name: string;                  // "Printful"

  // Connection
  connect(credentials: Record<string, string>): Promise<{ ok: boolean; error?: string }>;
  disconnect(merchantId: string): Promise<void>;
  isConnected(merchantId: string): Promise<boolean>;

  // Product sync
  importProducts(merchantId: string): Promise<Product[]>;
  syncVariants(merchantId: string, productId: number): Promise<Variant[]>;

  // Order fulfillment
  createOrder(merchantId: string, order: OrderPayload): Promise<OrderResult>;
  getOrderStatus(merchantId: string, orderId: string): Promise<OrderStatus>;
  cancelOrder(merchantId: string, orderId: string): Promise<boolean>;

  // Shipping
  estimateShipping(merchantId: string, payload: ShippingPayload): Promise<ShippingRate[]>;

  // Webhooks
  handleWebhook(merchantId: string, rawBody: string, headers: Headers): Promise<WebhookResult>;
}
```

### Database Schema (Supabase)
```sql
-- Merchant fulfillment provider connections
create table merchant_fulfillment_providers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) not null,
  provider text not null,              -- 'printful', 'printify', 'manual'
  credentials_encrypted jsonb not null, -- { apiKey: encrypted, storeId: '...' }
  is_active boolean default true,
  connected_at timestamptz default now(),
  last_sync_at timestamptz,
  product_count int default 0
);

-- Synced products from fulfillment providers
create table fulfillment_products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) not null,
  provider text not null,
  external_product_id text not null,    -- Printful product ID
  name text not null,
  thumbnail_url text,
  synced_at timestamptz default now(),
  variants jsonb not null default '[]'  -- [{ id, name, price, sku, external_variant_id }]
);

-- Orders sent to fulfillment providers
create table fulfillment_orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) not null,
  provider text not null,
  order_id text not null,               -- Our internal order ID
  external_order_id text,               -- Printful order ID
  status text default 'pending',        -- pending, submitted, in_production, shipped, delivered, failed, canceled
  tracking_number text,
  tracking_url text,
  carrier text,
  recipient jsonb not null,
  items jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Merchant Dashboard UI

#### "Connect Printful" Flow
1. Merchant goes to Dashboard → Settings → Fulfillment
2. Clicks "Connect Printful"
3. Modal: "Paste your Printful API token" (with link to Printful dashboard to generate one)
4. Optionally enter Store ID (or we list their stores and they pick one)
5. On submit → `POST /api/merchant/fulfillment/connect`
   - Validates the API key by calling `GET https://api.printful.com/store`
   - If valid → encrypt + store in `merchant_fulfillment_providers`
   - Auto-import products via `listProducts()` + `getProduct()` for each
6. Success → show imported products with variant count

#### Product Management
- After connecting, merchant sees their Printful products in the dashboard
- They can set retail prices (in sats AND/OR USD) — Printful only knows their cost price
- They can enable/disable products for their storefront
- "Sync Products" button to re-import from Printful

#### Order Management
- Dashboard shows orders with fulfillment status
- Status updates come from Printful webhooks
- Tracking numbers displayed when available

### API Routes

```
POST   /api/merchant/fulfillment/connect      — Connect a fulfillment provider
DELETE /api/merchant/fulfillment/disconnect    — Disconnect provider
GET    /api/merchant/fulfillment/products      — List synced products
POST   /api/merchant/fulfillment/sync          — Re-sync products from provider
POST   /api/merchant/fulfillment/order         — Create fulfillment order (called after payment)
GET    /api/merchant/fulfillment/orders        — List fulfillment orders
POST   /api/webhooks/printful/[merchantId]     — Per-merchant Printful webhook endpoint
```

### Checkout Flow Integration
When a customer buys a product that has a fulfillment provider:

1. **Payment** (Lightning or Stripe) completes
2. System looks up the product's fulfillment provider
3. Decrypts merchant's Printful credentials from DB
4. Calls `createDropshipOrder()` with the customer's shipping address
5. Stores the Printful order ID in `fulfillment_orders`
6. Printful prints & ships → webhook updates status

### Webhook Architecture
Each merchant gets a unique webhook URL:
```
https://openbazaar.ai/api/webhooks/printful/{merchantId}
```
When a merchant connects Printful, we register this webhook URL with Printful's API:
```bash
curl -X POST "https://api.printful.com/webhooks" \
  -H "Authorization: Bearer $MERCHANT_PRINTFUL_KEY" \
  -d '{"url": "https://openbazaar.ai/api/webhooks/printful/merchant_abc123", "types": ["package_shipped", "order_failed"]}'
```

### Security
- **Credentials encryption**: Use Supabase Vault or application-level AES-256-GCM encryption
- **No secrets in code**: Everything is per-merchant, stored in DB
- **Webhook verification**: Each merchant's Printful webhook has its own signing secret
- **API key validation**: Always validate before storing (call Printful API to verify)

## Implementation Order

### Phase 1 — Core (get it working)
1. Supabase migrations for the 3 tables
2. Printful provider implementation (implements FulfillmentProvider interface)
3. `POST /api/merchant/fulfillment/connect` — validate + store + import
4. `POST /api/merchant/fulfillment/order` — create Printful order
5. `POST /api/webhooks/printful/[merchantId]` — handle shipping events

### Phase 2 — Dashboard UI
6. "Connect Printful" modal in merchant settings
7. Product list with price editing
8. Order list with status tracking

### Phase 3 — Polish
9. Auto-register Printful webhook on connect
10. Product sync scheduling (daily cron)
11. Multi-provider support (add Printify, manual fulfillment)
12. Shipping rate calculator in checkout

## Key Files from Reference Implementation
| What | Where |
|---|---|
| Printful API client | `packages/printful-client/src/client.ts` |
| Webhook verification | `packages/printful-client/src/webhook.ts` |
| Product sync (list/get) | `packages/printful-client/src/sync.ts` |
| Types | `packages/printful-client/src/types.ts` |
| Stripe → Printful webhook | `clients/glacier-ice-cream/store-site/src/app/api/checkout/webhook/route.ts` |
| Working product data | `clients/glacier-ice-cream/store-site/src/data/products.ts` (search for `printfulVariantId`) |

## Printful API Credentials (for testing)
- API Key: stored in `TE Code/.claude/vault/MASTER_VAULT.env` as `GLACIER_PRINTFUL_API_KEY`
- Store ID: `17809413`
- These are Glacier's — OpenBazaar.ai merchants would use their own
