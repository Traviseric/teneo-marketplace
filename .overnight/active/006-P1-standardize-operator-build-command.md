---
id: 6
title: "Standardize operator build command via orchestrator run_boxes.py"
priority: P1
severity: medium
status: completed
source: AGENT_TASKS.md
file: .overnight/
line: null
created: "2026-03-09T00:00:00"
execution_hint: parallel
context_group: managed_service
group_reason: "Phase 1A managed-service tasks: 006-007-008 are all delivery/tooling improvements that don't share code files"
---

# Standardize Operator Build Command via Orchestrator

**Priority:** P1 (medium)
**Source:** AGENT_TASKS.md Phase 1A Managed-Service Commercialization
**Location:** .overnight/run_boxes.py (or equivalent orchestrator script)

## Problem

The managed-service model requires operators (Travis/team) to kick off AI store builds in a repeatable, standardized way. Currently there is no documented `run_boxes.py` command or equivalent for triggering the full build pipeline: intake → planning → building → QA → delivery.

Without a standard operator command, each build requires ad-hoc steps and can't be reliably handed off or repeated.

## How to Fix

1. **Audit** the existing orchestrator/run infrastructure in `.overnight/`:
   - Read `run_boxes.py` or equivalent launcher if it exists
   - Read `flow_reference.md` to understand the current pipeline
   - Check the `store_builds` status stages: intake → planning → building → qa → delivered → failed

2. **Define the operator build command**. Options:
   - A new Python/Node script: `node marketplace/backend/scripts/run-store-build.js <build_id>`
   - Or a bat/sh script in `.overnight/`

3. **Implement the build runner**:
   - Accept a `build_id` from the `store_builds` table
   - Progress the build through: intake (read) → planning (call Claude API) → building (render) → qa (validate HTML) → delivered (set URL + status)
   - Write progress to `store_builds.status` column
   - Log each stage to console/log file

4. **Document** the command in `docs/` or README section for operators

5. Ensure the command can be run from the repo root without special env setup (reads `.env`)

## Acceptance Criteria

- [ ] Operator can run a single command to process a `store_builds` intake record through to delivery
- [ ] Status field is updated at each stage (intake → planning → building → qa → delivered)
- [ ] Failures are caught and status set to `failed` with error reason
- [ ] Command is documented in README or a `docs/OPERATOR_GUIDE.md`

## Notes

_Generated from AGENT_TASKS.md Phase 1A. Depends on store renderer (task 004) and persistence (task 005) being complete first._
