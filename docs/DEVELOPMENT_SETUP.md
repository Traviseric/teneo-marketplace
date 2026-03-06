# Development Setup

## Prerequisites

- Node.js 18+
- npm

## Quick Start

```bash
npm install
npm run dev   # starts backend on port 3001 with auto-restart
```

To initialize the database (SQLite, local):

```bash
node marketplace/backend/database/init.js
```

To load sample book data:

```bash
node marketplace/backend/scripts/create-real-data.js
```

## Database Modes

The DB adapter auto-detects which mode to use at startup based on environment variables. A log line is printed on startup indicating the active mode.

### Local Development (SQLite — default)

No configuration needed. If neither `DATABASE_URL` nor `SUPABASE_DB_URL` is set, the server uses SQLite automatically.

- SQLite file: `marketplace/backend/database/marketplace.db`
- Schema: `marketplace/backend/database/schema.sql`
- Initialize: `node marketplace/backend/database/init.js`

In production containers (Render, Vercel) the app directory may be read-only, so SQLite falls back to `/tmp/marketplace.db` unless `DATABASE_PATH` is explicitly set.

### Production / Supabase (Postgres)

Set one of these env vars to your Supabase or Postgres connection string:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
# or
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

When either variable is set, the adapter connects to Postgres and all SQLite fallback logic is bypassed.

- Schema/migration: `marketplace/backend/database/supabase-migration.sql`
- SSL is auto-enabled for Supabase connections (detected by hostname)
- The `pg` package must be installed (`npm install pg`)

### Schema Differences

| Feature | SQLite (local) | Postgres/Supabase |
|---------|---------------|-------------------|
| Placeholders | `?` | `$1, $2, ...` (auto-translated) |
| Upsert | `INSERT OR REPLACE` | `ON CONFLICT ... DO UPDATE` (auto-translated) |
| Date functions | `datetime('now')` | `NOW()` (auto-translated) |
| Transactions | `BEGIN TRANSACTION` / `COMMIT` | `BEGIN` / `COMMIT` |
| Identity | `AUTOINCREMENT` | `SERIAL` / `BIGSERIAL` |

The adapter handles these translations automatically — you can write SQLite-style SQL in the codebase and it will work in both modes.

### Choosing a Mode for Local Dev

You do **not** need a Supabase account to run locally. SQLite is the default and requires no setup. Only set `DATABASE_URL` if you are:

- Testing against a real Supabase project
- Running the DB parity test script (`scripts/test-db-parity.js`)
- Deploying to a production or staging environment

## Environment Variables

Copy `.env.example` to `.env` and fill in only what you need:

```bash
cp marketplace/backend/.env.example marketplace/backend/.env
```

For local SQLite development, the only required changes are:

```env
SESSION_SECRET=any-random-string-here
ADMIN_PASSWORD_HASH=<generate with node scripts/generate-password-hash.js --generate>
```

Everything else is optional for basic local use.

## Running Tests

```bash
node test-api.js           # API endpoint smoke tests
node test-purchase-flow.js # Purchase flow integration tests
node scripts/test-db-parity.js  # DB adapter parity (requires both SQLite and Postgres)
```
