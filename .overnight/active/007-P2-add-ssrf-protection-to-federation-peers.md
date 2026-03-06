---
id: 7
title: "Add SSRF protection to federation peer endpoint requests"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/server.js
line: 456
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: server_hardening
group_reason: "Server-level hardening task"
---

# Add SSRF Protection to Federation Peer Endpoint Requests

**Priority:** P2 (medium)
**Source:** security_audit
**Location:** marketplace/backend/server.js:456

## Problem

Federation peer endpoints stored in `networkConfig` are used as targets for outbound HTTP requests. If an admin can modify the peer list (or it is loaded from an unvalidated registry), the server will make HTTP requests to arbitrary URLs — potentially reaching internal services on the same cloud network (metadata APIs, internal databases, other services).

**Code with issue:**
```javascript
const peerRequests = networkConfig.networkPeers.map(peer =>
    axios.get(`${peer.endpoint}/api/search`, { params: { q: query }, timeout: 3000 })
```

## How to Fix

Validate federation peer endpoints before making outbound requests:

1. Parse the URL with `new URL(peer.endpoint)` and check the hostname
2. Block private/loopback IP ranges: `127.x.x.x`, `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `169.254.x.x` (cloud metadata)
3. Block `localhost`, `metadata.google.internal`, `169.254.169.254`
4. Only allow `https://` scheme (no `file://`, `ftp://`, `http://` to known-internal hosts)

```javascript
function isAllowedPeerEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname;
    // Block private/loopback ranges
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    if (hostname === 'metadata.google.internal') return false;
    return true;
  } catch { return false; }
}

const validPeers = networkConfig.networkPeers.filter(p => isAllowedPeerEndpoint(p.endpoint));
const peerRequests = validPeers.map(peer => axios.get(...));
```

## Acceptance Criteria

- [ ] Peer endpoints validated before outbound requests
- [ ] Private IP ranges and localhost blocked
- [ ] Cloud metadata endpoint (169.254.169.254) blocked
- [ ] Invalid peer endpoints are skipped (logged, not errored)
- [ ] Valid external peer endpoints still work

## Notes

_Generated from security_audit findings. CWE-918._
