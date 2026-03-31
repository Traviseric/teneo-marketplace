# Fulfillment Providers

**Status:** Shipped (March 2026)
**Spec:** `specs/PRINTFUL-FULFILLMENT-PROVIDER.md`

## Overview

Multi-tenant fulfillment system that lets any merchant connect their own print-on-demand or shipping provider and sell physical products through OpenBazaar.ai. Credentials are encrypted per-merchant (AES-256-GCM) and stored in the database. No secrets baked into the codebase.

## Providers

| Provider | Type | Status |
|----------|------|--------|
| Printful | Print-on-demand | Shipped — full integration (connect, sync, order, webhook, dashboard) |
| Manual | Self-shipped | Shipped — record orders, merchant marks shipped with tracking |
| Lulu | Book printing | Legacy single-tenant (env vars) |
| Printify | Print-on-demand | Planned |

## Architecture

```
Merchant Dashboard (merchant-fulfillment.html)
    |
    v
/api/merchant/fulfillment/* (10 endpoints)
    |
    v
PrintfulFulfillmentProvider / ManualFulfillmentProvider
    |
    +--> Printful API (per-merchant credentials from DB)
    +--> fulfillment_products (synced catalog)
    +--> fulfillment_orders (order tracking)
    |
    v
/api/webhooks/printful/:merchantId (per-merchant webhook)
    |
    v
Order status updates + shipping email notifications
```

## Database Tables

- **merchant_fulfillment_providers** — per-merchant provider connections with encrypted credentials
- **fulfillment_products** — synced products from providers (Printful catalog import)
- **fulfillment_orders** — orders sent to providers with status tracking

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/merchant/fulfillment/status` | Session | Connection state per provider |
| POST | `/api/merchant/fulfillment/connect` | Session | Connect provider (printful or manual) |
| DELETE | `/api/merchant/fulfillment/disconnect` | Session | Disconnect provider |
| GET | `/api/merchant/fulfillment/products` | Session | List synced products |
| PUT | `/api/merchant/fulfillment/products/:id` | Session | Update retail price / active toggle |
| POST | `/api/merchant/fulfillment/sync` | Session | Re-import products from provider |
| POST | `/api/merchant/fulfillment/order` | Session | Create fulfillment order |
| GET | `/api/merchant/fulfillment/orders` | Session | List fulfillment orders |
| POST | `/api/merchant/fulfillment/orders/:id/ship` | Session | Mark manual order as shipped |
| POST | `/api/merchant/fulfillment/shipping-rates` | Public | Estimate shipping rates (for checkout) |
| POST | `/api/webhooks/printful/:merchantId` | Webhook sig | Per-merchant Printful webhook |
| POST | `/api/webhooks/printful` | Webhook sig | Legacy global Printful webhook |

## Connect Flow

1. Merchant authenticates (existing session auth)
2. `POST /connect` with `{ provider: "printful", apiKey: "..." }`
3. API key validated against Printful `GET /store`
4. Webhook auto-registered at `POST /webhooks` on Printful API
5. Credentials encrypted (AES-256-GCM) and stored in `merchant_fulfillment_providers`
6. Products auto-imported via `GET /store/products` + `GET /store/products/:id`
7. Dashboard shows imported products with variant counts

## Webhook Flow

1. Printful sends event to `POST /api/webhooks/printful/{merchantId}`
2. Merchant's webhook secret decrypted from DB for signature verification
3. Event parsed and deduplicated via `printful_webhook_events` table
4. `fulfillment_orders` and `orders` tables updated with status
5. Shipping confirmation email sent on `package_shipped`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FULFILLMENT_ENCRYPTION_KEY` | Yes (for multi-tenant) | 64-char hex string for AES-256-GCM credential encryption |
| `PUBLIC_URL` | Recommended | Base URL for auto-registering Printful webhooks (e.g., `https://openbazaar.ai`) |
| `PRINTFUL_API_KEY` | No | Legacy single-tenant fallback |
| `PRINTFUL_STORE_ID` | No | Legacy single-tenant fallback |
| `PRINTFUL_WEBHOOK_SECRET` | No | Legacy single-tenant fallback |

## Key Files

| File | Purpose |
|------|---------|
| `services/printfulFulfillmentProvider.js` | Multi-tenant Printful provider (connect, sync, order, webhook) |
| `services/manualFulfillmentProvider.js` | Self-shipped provider (record + mark shipped) |
| `services/fulfillmentProvider.js` | Abstract base class |
| `services/fulfillmentService.js` | Provider registry |
| `services/credentialEncryption.js` | AES-256-GCM encrypt/decrypt for merchant API keys |
| `routes/merchantFulfillment.js` | 10 merchant API endpoints |
| `routes/printfulWebhooks.js` | Per-merchant + legacy webhook handlers |
| `frontend/merchant-fulfillment.html` | Dashboard UI |
| `database/schema.sql` | Table definitions |
| `__tests__/printfulFulfillment.test.js` | 13 unit tests |
