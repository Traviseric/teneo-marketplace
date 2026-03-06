# Trademark Filing Automation

This repository includes a legal-ops workflow to prepare trademark filing packets for every brand that starts generating revenue.

## What this does

- Stores trademark pipeline data in `legal/trademarks.registry.json`.
- Generates a dated filing packet for each mark:
  - `teas-intake.json`
  - `teas-copy-paste.md`
  - `dropoff-checklist.md`
  - `packet-summary.json`
  - `unresolved-fields.json`
  - `goods-services.md`
  - `submission-checklist.md`
  - `specimen-checklist.md`
  - `deadline-calendar.md`
  - `enforcement-playbook.md`
- Tracks missing required data before filing.

## Important limit

The USPTO TEAS filing step is still manual. This tooling automates preparation, quality checks, and docketing so legal can file faster with fewer mistakes.

## Commands

```bash
npm run trademark:report
npm run trademark:prepare
npm run trademark:prepare:openbazaar
```

## Prepare all ready marks

```bash
node tools/trademark-filing.js
```

By default, marks in `draft_ready` or `ready_for_filing` are processed.

## Prepare one mark

```bash
node tools/trademark-filing.js --mark openbazaar-ai-wordmark
```

## Dry run

```bash
node tools/trademark-filing.js --mark openbazaar-ai-wordmark --dry-run
```

## Report only

```bash
node tools/trademark-filing.js --report
```

## Override output/date

```bash
node tools/trademark-filing.js --mark openbazaar-ai-wordmark --outdir legal/trademark-dossiers --date 2026-03-05
```

## OpenBazaar.ai record

Seeded mark id: `openbazaar-ai-wordmark`

Before filing in TEAS:

1. Fill unresolved fields listed in `unresolved-fields.json`.
2. Open USPTO TEAS and use `teas-copy-paste.md` while filing.
3. Confirm goods/services wording with USPTO ID Manual and counsel.
4. Run a knockout search to reduce refusal/conflict risk.
5. Submit in TEAS and write the serial number back to `legal/trademarks.registry.json`.
