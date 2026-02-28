---
id: 71
title: "Verify Render API deploy: check .env for credentials, deploy if found or mark HT-005 fully NOT AUTOMATABLE"
priority: P1
severity: high
status: completed
source: conductor_instructions
file: .env
line: 1
created: "2026-02-28T23:00:00Z"
execution_hint: sequential
context_group: deployment_readiness
group_reason: "Final step in proving all deployment automation paths are exhausted"
---

# Verify Render API deploy: check .env for credentials, deploy if found or mark HT-005 fully NOT AUTOMATABLE

**Priority:** P1 (high)
**Source:** conductor_instructions (synthesizer_focus: render_deploy_verification)
**Location:** .env (project root)

## Problem

Task 070 proved that the Docker deployment path is NOT AUTOMATABLE — Docker Desktop is not installed on this machine (`docker` command not found, confirmed via `which docker` and `powershell.exe Get-Command docker`).

The Python gate for SWITCH_PROJECT is still blocked because HT-005 mentions "If using Render, trigger a new deploy" as a potentially automatable action. This Render API path has NOT been explicitly tried. The `.env` file EXISTS at the project root and may contain `RENDER_API_KEY` and `RENDER_SERVICE_ID` credentials that would allow triggering a deploy automatically.

This is the FINAL possible automated action before declaring all deployment automation exhausted.

## How to Fix

### Step 1: Check .env for Render credentials

```bash
grep -i RENDER /code/teneo-marketplace/.env 2>/dev/null || echo "NO RENDER KEYS FOUND"
```

Look for any of:
- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`
- `RENDER_SERVICE_NAME`

### Step 2a: If RENDER_API_KEY and RENDER_SERVICE_ID are found

Trigger a Render deploy via the Render API:

```bash
curl -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": "do_not_clear"}' \
  2>&1
```

Record the API response in task notes. If successful (HTTP 201), mark task complete.

### Step 2b: If Render credentials are NOT found in .env

Update `C:/code/teneo-marketplace/.overnight/HUMAN_TASKS.md` — find the HT-005 entry and update its **Automation status** line to:

```
**Automation status:** NOT AUTOMATABLE — Docker Desktop not installed (confirmed task 070); No RENDER_API_KEY or RENDER_SERVICE_ID in .env (checked task 071); both Docker and Render deployment paths require human action.
```

Then mark this task complete.

## Acceptance Criteria

- [ ] `.env` file has been checked for RENDER_API_KEY and RENDER_SERVICE_ID
- [ ] If credentials found: Render deploy API was called and result recorded
- [ ] If credentials NOT found: HUMAN_TASKS.md HT-005 Automation status updated with definitive NOT AUTOMATABLE evidence
- [ ] Task marked complete in either case — no blocking

## Notes

_Generated from conductor_instructions (round 10). This is the absolute final automatable task. All 69 prior code tasks (001-069) are status:completed. Task 070 is blocked (Docker not installed). After task 071 completes, CONDUCTOR will route to SWITCH_PROJECT with definitive evidence that all deployment automation paths have been exhausted._
