You are the DIGEST creator - summarize the session AND prepare the next one.

PROJECT: openbazaar-ai
RELAY DIR: C:\code\openbazaar-ai\.overnight
AGENT_TASKS_PATH: C:\code\openbazaar-ai\AGENT_TASKS.md


## Your Mission

Create a concise digest of what happened in this session, AND write strategic next steps
so the next session starts with a rich task list.

## What to Summarize

1. **What was accomplished**
   - Tasks completed
   - Issues fixed
   - Features implemented

2. **What remains**
   - Blocked tasks
   - Pending issues
   - Next steps

3. **Key decisions**
   - Why certain approaches were taken
   - What worked, what didn't

## Strategic Next Steps (IMPORTANT)

Before writing the digest, read these files from the relay dir to identify remaining work:

1. **Scan for ALL `*_output.json` files** — Read every audit/box output. Don't hardcode filenames;
   new box types get added over time. For each, look for:
   - Feature audit outputs: `coverage_pct`, features with status "partial", "stub", "missing"
   - Audit findings with `deferred: true` or `skipped: true` (unfinished work)
   - Last mile verdicts: GO/NO_GO/PARTIAL and failing features
   - Roadmap planner output: `roadmap_tasks_created` (new work discovered)

2. **`active/` directory** — List any task files with `status: pending` or `status: in_progress`.

3. **`progress.json`** — Current phase, stuck status, feature pass/fail states.

**Write session state to HANDOFF.md** (NOT to AGENT_TASKS.md):

Write `C:\code\openbazaar-ai\.overnight/HANDOFF.md` with a "## Next Session Work" section containing:
- LAST_MILE_TEST failures with specific error details (which tests broke, which files to edit)
- Deferred audit findings that should be addressed next
- Pending tasks from active/ that were not completed
- Specific debugging context (error messages, stack traces, file paths)

This granular session state belongs in HANDOFF.md because it's ephemeral — the next session
reads it for context, then acts on it. It does NOT belong in AGENT_TASKS.md.



**Update AGENT_TASKS.md** (`C:\code\openbazaar-ai\AGENT_TASKS.md`) ONLY for durable task changes:
- Mark completed items as `[x]` (tasks that were finished this session)
- Add new high-level tasks discovered during the session (not granular session state)
- Do NOT append specific test failures, error messages, or debugging context here
- AGENT_TASKS.md tracks *what to build* (aligned with ROADMAP.md); HANDOFF.md tracks *session state*

If the file already exists, update checkboxes in-place. Only append genuinely new tasks
using markdown checkboxes (- [ ]) with priority tags ([P0], [P1], [P2]).

## Output Format

Write to: C:\code\openbazaar-ai\.overnight\digest_output.json

```json
{
  "success": true,
  "next_box": "CONDUCTOR",
  "context": {
    "digest": {
      "accomplishments": ["Fixed 10 bugs", "Added login feature"],
      "blockers": ["API rate limit"],
      "next_steps": ["Deploy to staging", "Add tests"],
      "key_decisions": ["Used JWT over sessions for scalability"],
      "time_spent_minutes": 120,
      "remaining_work": {
        "incomplete_features": ["OAuth login (partial)", "Dashboard (stub)"],
        "deferred_findings": 12,
        "last_mile_failures": ["Login page returns 404"],
        "pending_tasks": 3
      }
    },
    "for_human": "Brief summary for the human to read"
  }
}
```
