---
id: 2
title: "Implement NIP-05 DNS verification for merchants"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/network.js
created: "2026-03-09T20:00:00"
execution_hint: sequential
context_group: nostr_payments
group_reason: "Related to NIP-57 task — both extend Nostr identity/payment features"
---

# Implement NIP-05 DNS verification for merchants

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 3: Payments & Identity)
**Location:** marketplace/backend/routes/network.js, openbazaar-site/, stores DNS

## Problem

Merchants on OpenBazaar.ai have no Nostr identity verification. NIP-05 allows a
domain to confirm ownership of a Nostr pubkey by hosting a JSON file at:
`https://<domain>/.well-known/nostr.json?name=<handle>`

Without NIP-05, merchants' Nostr pubkeys appear as raw hex in Nostr clients, reducing
trust and discoverability. With NIP-05, merchants get a human-readable identifier like
`alice@openbazaar.ai` that Nostr clients display and can verify.

## How to Fix

1. **Create `.well-known/nostr.json` route** in `marketplace/backend/routes/network.js`
   (or a new `wellKnownRoutes.js`):
   ```javascript
   // GET /.well-known/nostr.json?name=<handle>
   app.get('/.well-known/nostr.json', async (req, res) => {
     const name = req.query.name;
     if (!name) return res.status(400).json({ error: 'name required' });
     const store = await db.getStoreBySlug(name);
     if (!store?.nostr_pubkey) return res.status(404).json({ names: {} });
     res.set('Access-Control-Allow-Origin', '*');
     res.json({ names: { [name]: store.nostr_pubkey } });
   });
   ```

2. **Add `nostr_pubkey` column to stores** (if not already present):
   - Check `marketplace/backend/database/schema.sql` — if `stores` table lacks
     `nostr_pubkey TEXT`, add a migration: `ALTER TABLE stores ADD COLUMN nostr_pubkey TEXT;`
   - Add to Supabase migration SQL as well.

3. **Merchant settings UI** — add a "Nostr Identity" section to the store management
   page where merchants can paste their Nostr pubkey (hex or npub format):
   - Input field: "Your Nostr public key (npub or hex)"
   - Save via `PATCH /api/stores/:id` updating `nostr_pubkey`
   - Display their NIP-05 identifier: `<slug>@openbazaar.ai`
   - Show verification badge if pubkey is set

4. **Mount route in `server.js`** before other routes so `/.well-known/nostr.json`
   is served correctly.

5. **Tests**: Add Jest tests for the `.well-known/nostr.json` endpoint:
   - Returns correct JSON for known handle
   - Returns 404 for unknown handle
   - Includes correct CORS header

## Acceptance Criteria

- [ ] `GET /.well-known/nostr.json?name=alice` returns `{"names":{"alice":"<pubkey>"}}`
   for stores with a saved Nostr pubkey
- [ ] Returns 404 for unknown handles
- [ ] Response includes `Access-Control-Allow-Origin: *` header
- [ ] Merchants can save their Nostr pubkey via store settings UI
- [ ] NIP-05 identifier displayed in merchant settings
- [ ] Jest tests cover the endpoint
- [ ] No regressions in existing network/federation routes

## Notes

_Generated from project_declared findings — AGENT_TASKS.md Phase 3 unchecked item._
_NIP-07 (browser auth) and NIP-98 (HTTP auth) are already implemented._
_NIP-99 product listings (kind 30402) are implemented — NIP-05 completes the Nostr identity stack._
