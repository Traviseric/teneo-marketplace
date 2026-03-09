# Operator Guide — Managed AI Store Builds

This guide covers the operator workflow for processing paid managed store build requests end-to-end.

## Build Pipeline Stages

```
intake → planning → building → qa → delivered
                                           ↘
                                         failed (any stage can fail)
```

| Stage     | Description |
|-----------|-------------|
| `intake`  | Build request received from client (via `/api/store-builder/intake`) |
| `planning`| Claude API generates `store_config` from the business brief |
| `building`| `storeRendererService` renders HTML from config; store saved to DB |
| `qa`      | Static HTML delivery checks run (see below) |
| `delivered` | Store published at `/store/<slug>`; client can be notified |
| `failed`  | Error at any stage; `error_message` in `store_builds` record |

---

## Running a Build

### 1. Find the build ID

Intake requests are created automatically when a client submits the form at `/store-builder-intake.html`.
The client receives a Build ID via email. You can also list pending builds via the admin API:

```bash
curl -H "x-admin-password: $ADMIN_PASSWORD" \
  http://localhost:3001/api/store-builder/builds?status=intake
```

### 2. Run the operator build command

```bash
node marketplace/backend/scripts/run-store-build.js <build_id>
```

**Prerequisites:**
- `ANTHROPIC_API_KEY` set in `marketplace/backend/.env`
- Database initialized (`node marketplace/backend/database/init.js`)
- Server does NOT need to be running (script connects to DB directly)

**Example output:**
```
[2026-03-09T...] [INTAKE   ] Loading build abc123...
[2026-03-09T...] [INTAKE   ] Brief: "I run Earthy Candle Co..."
[2026-03-09T...] [PLANNING ] Calling AI Store Builder to generate config...
[2026-03-09T...] [PLANNING ] Config generated: "Earthy Candle Co."
[2026-03-09T...] [BUILDING ] Rendering store HTML...
[2026-03-09T...] [BUILDING ] HTML rendered: 14.2 KB
[2026-03-09T...] [BUILDING ] Store saved: /store/earthy-candle-co-abc12345 (3 products)
[2026-03-09T...] [QA       ] Running static delivery checks...
[2026-03-09T...] [QA       ]   ✓ Non-empty HTML body
[2026-03-09T...] [QA       ]   ✓ Valid DOCTYPE
...
[2026-03-09T...] [DELIVERED] Build complete!

========================================
  BUILD COMPLETE
========================================
  Build ID   : abc123...
  Store URL  : /store/earthy-candle-co-abc12345
  Products   : 3
  Tier       : pro
  Client     : client@example.com
========================================
```

### 3. Manual delivery check (optional)

After the build runs, or when verifying a live store, run the delivery checker:

```bash
node marketplace/backend/scripts/delivery-check.js <store_slug> [base_url]
```

**Example:**
```bash
# Check local dev server
node marketplace/backend/scripts/delivery-check.js earthy-candle-co-abc12345

# Check production
node marketplace/backend/scripts/delivery-check.js earthy-candle-co-abc12345 https://openbazaar.ai
```

**Checks performed:**
- HTTP 200 response
- `<title>` tag present
- `<meta name="description">` present
- `<meta name="viewport">` (mobile responsiveness)
- No inline widths wider than 768px
- Checkout button or link present
- Email capture `<input type="email">` present
- Open Graph image meta tag

Exit code 0 = all pass. Exit code 1 = one or more failures.

---

## Monitoring Build Status

```bash
# View all builds (admin)
curl -H "x-admin-password: $ADMIN_PASSWORD" \
  http://localhost:3001/api/store-builder/builds

# View builds by status
curl -H "x-admin-password: $ADMIN_PASSWORD" \
  "http://localhost:3001/api/store-builder/builds?status=intake"

# View a specific build
curl http://localhost:3001/api/store-builder/builds/<build_id>

# Manually update status (e.g., mark delivered with a note)
curl -X PATCH \
  -H "x-admin-password: $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"status":"delivered","notes":"Delivered to client at /store/earthy-candle-co-abc12345"}' \
  http://localhost:3001/api/store-builder/builds/<build_id>/status
```

---

## Troubleshooting

### Build stuck at `intake`
The build runner exits early if ANTHROPIC_API_KEY is not set. Check `.env`.

### `planning` stage fails
Claude API error. Check API key validity and quota. The error message is stored in `store_builds.operator_notes`.

### QA checks fail
The `building` stage generated HTML that doesn't pass delivery checks. Common fixes:
- Check `storeRendererService.js` for rendering issues
- Manually review the generated HTML via `/api/store-builder/stores/:id/preview`

### Re-running a failed build
Currently a failed build must be re-submitted via intake (the runner only accepts `intake` status builds).
A future version will support re-running from a failed state.

---

## Tiers

| Tier          | Price  | Notes |
|---------------|--------|-------|
| `builder`     | $97    | Basic AI-generated store, 1 template, 48h delivery |
| `pro`         | $297   | Full brand customization, up to 10 products, email funnel |
| `white_label` | $997   | Custom domain, unlimited products, dedicated onboarding |
