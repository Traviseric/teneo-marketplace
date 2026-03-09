---
id: 3
title: "Log WebSocket empty catch blocks in zapService.js"
priority: P1
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/services/zapService.js
line: 228
created: "2026-03-09T23:45:00Z"
execution_hint: sequential
context_group: zap_service
group_reason: "Same file as task 009"
---

# Log WebSocket empty catch blocks in zapService.js

**Priority:** P1 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/zapService.js:228, 254, 272

## Problem

Empty catch blocks `catch (_) {}` appear at lines 228, 254, 272 in zapService.js. While WebSocket close errors are sometimes acceptable to ignore, silent failures in `ws.send()` mean that Nostr subscription requests can fail without any trace.

When `ws.send(subscriptionRequest)` at line 254 fails silently, the service will never receive zap receipts for that WebSocket connection, causing zap-to-unlock to silently not work — customers pay and nothing happens.

**Code with issue (lines 228, 254, 272):**
```javascript
try { if (ws && ws.readyState === WebSocket.OPEN) ws.close(); } catch (_) {}
try { ws.send(req); } catch (_) {}
// ...
} catch (_) {}
```

## How to Fix

Add debug-level logging to the catch blocks:

```javascript
// Line 228 — WS close (low priority, often expected)
try {
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
} catch (e) {
  console.debug('[zapService] WS close error (expected):', e.message);
}

// Line 254 — WS send (higher priority — failure means no zap receipts)
try {
  ws.send(req);
} catch (e) {
  console.error('[zapService] WS send failed — zap subscription lost:', e.message);
}

// Line 272 — log with context
} catch (e) {
  console.error('[zapService] Unexpected error in relay handler:', e.message);
}
```

## Acceptance Criteria

- [ ] All 3 empty catch blocks in zapService.js have logging
- [ ] ws.send failure is logged at error level
- [ ] ws.close failure is logged at debug level
- [ ] zapService tests still pass

## Notes

_Generated from code_quality_audit findings._
