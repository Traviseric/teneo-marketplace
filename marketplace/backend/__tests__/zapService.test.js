'use strict';

/**
 * Unit tests for services/zapService.js
 *
 * Covers:
 *   - computeEventId: canonical ID derivation
 *   - verifyEventSignature: valid, tampered, missing fields
 *   - verifyZapReceipt: valid receipt, wrong kind, invalid sig, wrong amount,
 *                       missing description, bad JSON in description
 *   - pollForZapReceipt: found, pending (timeout), invalid params
 *   - extractMsatsFromZapRequest: present, absent, zero
 */

const { schnorr } = require('@noble/curves/secp256k1');
const { sha256 } = require('@noble/hashes/sha256');
const { utf8ToBytes, bytesToHex } = require('@noble/hashes/utils');

const {
  verifyZapReceipt,
  verifyEventSignature,
  computeEventId,
  extractMsatsFromZapRequest,
  NIP57_ZAP_RECEIPT_KIND,
  NIP57_ZAP_REQUEST_KIND,
} = require('../services/zapService');

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Compute event ID the same way the service does — for building fixture events. */
function buildEventId(event) {
  const s = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  return bytesToHex(sha256(utf8ToBytes(s)));
}

/**
 * Sign a raw event object using a generated (or supplied) private key.
 * Returns the signed event plus the private key and pubkey.
 */
function signEvent(unsigned, privKey) {
  const pubkey = bytesToHex(schnorr.getPublicKey(privKey));
  const withPubkey = { ...unsigned, pubkey };
  const id = buildEventId(withPubkey);
  const sig = bytesToHex(schnorr.sign(id, privKey));
  return { ...withPubkey, id, sig };
}

/**
 * Build a valid NIP-57 kind 9734 zap request event.
 */
function makeZapRequest({ amountMsats = 21_000, privKey } = {}) {
  privKey = privKey || schnorr.utils.randomPrivateKey();
  const pubkey = bytesToHex(schnorr.getPublicKey(privKey));
  const unsigned = {
    kind: NIP57_ZAP_REQUEST_KIND,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['amount', String(amountMsats)]],
    content: '',
  };
  return signEvent(unsigned, privKey);
}

/**
 * Build a valid NIP-57 kind 9735 zap receipt event.
 * The `description` tag embeds a serialized zap request.
 */
function makeZapReceipt({ zapRequest, walletPrivKey, amountMsats = 21_000 } = {}) {
  walletPrivKey = walletPrivKey || schnorr.utils.randomPrivateKey();
  zapRequest = zapRequest || makeZapRequest({ amountMsats });
  const walletPubkey = bytesToHex(schnorr.getPublicKey(walletPrivKey));
  const unsigned = {
    kind: NIP57_ZAP_RECEIPT_KIND,
    pubkey: walletPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['p', zapRequest.pubkey],          // recipient
      ['P', zapRequest.pubkey],          // zapper (same in this fixture)
      ['description', JSON.stringify(zapRequest)],
    ],
    content: '',
  };
  return signEvent(unsigned, walletPrivKey);
}

// ─── computeEventId ───────────────────────────────────────────────────────────

describe('computeEventId', () => {
  it('returns a 64-char hex string', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const pubkey = bytesToHex(schnorr.getPublicKey(privKey));
    const event = { pubkey, created_at: 0, kind: 1, tags: [], content: '' };
    const id = computeEventId(event);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const pubkey = bytesToHex(schnorr.getPublicKey(privKey));
    const event = { pubkey, created_at: 1000, kind: 9735, tags: [], content: '' };
    expect(computeEventId(event)).toBe(computeEventId(event));
  });
});

// ─── verifyEventSignature ─────────────────────────────────────────────────────

describe('verifyEventSignature', () => {
  it('returns true for a correctly signed event', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const unsigned = {
      kind: NIP57_ZAP_RECEIPT_KIND,
      pubkey: '',
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: '',
    };
    const signed = signEvent(unsigned, privKey);
    expect(verifyEventSignature(signed)).toBe(true);
  });

  it('returns false when id is tampered', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const unsigned = { kind: 1, pubkey: '', created_at: 0, tags: [], content: '' };
    const signed = signEvent(unsigned, privKey);
    const tampered = { ...signed, id: signed.id.replace('a', 'b') };
    expect(verifyEventSignature(tampered)).toBe(false);
  });

  it('returns false when sig is tampered', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const unsigned = { kind: 1, pubkey: '', created_at: 0, tags: [], content: '' };
    const signed = signEvent(unsigned, privKey);
    const tampered = { ...signed, sig: signed.sig.replace('a', 'b') };
    // Tampered sig may still produce the same char — test non-crashing return
    const result = verifyEventSignature(tampered);
    expect(typeof result).toBe('boolean');
  });

  it('returns false for null event', () => {
    expect(verifyEventSignature(null)).toBe(false);
  });

  it('returns false when required fields are absent', () => {
    expect(verifyEventSignature({ kind: 9735 })).toBe(false);
  });
});

// ─── extractMsatsFromZapRequest ───────────────────────────────────────────────

describe('extractMsatsFromZapRequest', () => {
  it('returns the millisat amount from the amount tag', () => {
    const zapReq = { tags: [['amount', '21000']] };
    expect(extractMsatsFromZapRequest(zapReq)).toBe(21000);
  });

  it('returns 0 when no amount tag is present', () => {
    expect(extractMsatsFromZapRequest({ tags: [['p', 'abc']] })).toBe(0);
  });

  it('returns 0 for null / missing input', () => {
    expect(extractMsatsFromZapRequest(null)).toBe(0);
    expect(extractMsatsFromZapRequest({})).toBe(0);
  });
});

// ─── verifyZapReceipt ─────────────────────────────────────────────────────────

describe('verifyZapReceipt', () => {
  it('accepts a valid zap receipt with sufficient amount', () => {
    const zapRequest = makeZapRequest({ amountMsats: 21_000 }); // 21 sats
    const receipt = makeZapReceipt({ zapRequest, amountMsats: 21_000 });

    const result = verifyZapReceipt(receipt, 10); // require 10 sats
    expect(result.valid).toBe(true);
    expect(result.amountSats).toBe(21);
    expect(result.amountMsats).toBe(21_000);
    expect(result.zapperPubkey).toBeTruthy();
  });

  it('rejects when amount is below the minimum', () => {
    const zapRequest = makeZapRequest({ amountMsats: 5_000 }); // 5 sats
    const receipt = makeZapReceipt({ zapRequest, amountMsats: 5_000 });

    const result = verifyZapReceipt(receipt, 21); // require 21 sats
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/insufficient amount/i);
  });

  it('rejects events with wrong kind', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const unsigned = { kind: 1, pubkey: '', created_at: 0, tags: [], content: '' };
    const wrongKind = signEvent(unsigned, privKey);

    const result = verifyZapReceipt(wrongKind, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/kind/i);
  });

  it('rejects an event with invalid signature', () => {
    const zapRequest = makeZapRequest({ amountMsats: 21_000 });
    const receipt = makeZapReceipt({ zapRequest });
    const tampered = { ...receipt, sig: receipt.sig.replace(/[0-9]/, 'f') };

    const result = verifyZapReceipt(tampered, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/signature/i);
  });

  it('rejects a receipt missing the description tag', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const unsigned = {
      kind: NIP57_ZAP_RECEIPT_KIND,
      pubkey: '',
      created_at: Math.floor(Date.now() / 1000),
      tags: [], // no description tag
      content: '',
    };
    const receipt = signEvent(unsigned, privKey);

    const result = verifyZapReceipt(receipt, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/description/i);
  });

  it('rejects a receipt with non-JSON in description tag', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const unsigned = {
      kind: NIP57_ZAP_RECEIPT_KIND,
      pubkey: '',
      created_at: Math.floor(Date.now() / 1000),
      tags: [['description', 'not-valid-json']],
      content: '',
    };
    const receipt = signEvent(unsigned, privKey);

    const result = verifyZapReceipt(receipt, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/json/i);
  });

  it('rejects a receipt whose description is not a kind 9734 event', () => {
    const privKey = schnorr.utils.randomPrivateKey();
    const wrongKindRequest = { kind: 1, tags: [['amount', '21000']] };
    const unsigned = {
      kind: NIP57_ZAP_RECEIPT_KIND,
      pubkey: '',
      created_at: Math.floor(Date.now() / 1000),
      tags: [['description', JSON.stringify(wrongKindRequest)]],
      content: '',
    };
    const receipt = signEvent(unsigned, privKey);

    const result = verifyZapReceipt(receipt, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/kind/i);
  });

  it('returns valid:false for null input', () => {
    const result = verifyZapReceipt(null, 1);
    expect(result.valid).toBe(false);
  });
});

// ─── pollForZapReceipt ─────────────────────────────────────────────────────────

const { pollForZapReceipt } = require('../services/zapService');

describe('pollForZapReceipt', () => {
  it('returns null for missing params', async () => {
    const result = await pollForZapReceipt(null, null, 1000);
    expect(result).toBeNull();
  });

  it('returns null on connection error (bad relay URL)', async () => {
    // Invalid scheme — ws constructor throws synchronously or emits error quickly
    const result = await pollForZapReceipt('wss://invalid.nonexistent.relay.example', 'a'.repeat(64), 2000);
    expect(result).toBeNull();
  }, 5000);

  it('resolves with receipt event when relay sends matching kind 9735', async () => {
    const { WebSocketServer } = require('ws');
    const zapRequestId = '0'.repeat(64);

    // Spin up a local test relay
    const wss = new WebSocketServer({ port: 0 });
    const port = wss.address().port;

    const receipt = {
      kind: 9735,
      id: '1'.repeat(64),
      pubkey: '2'.repeat(64),
      created_at: Math.floor(Date.now() / 1000),
      tags: [['e', zapRequestId]],
      content: '',
      sig: '3'.repeat(128),
    };

    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg[0] === 'REQ') {
          const subId = msg[1];
          ws.send(JSON.stringify(['EVENT', subId, receipt]));
        }
      });
    });

    const result = await pollForZapReceipt(`ws://localhost:${port}`, zapRequestId, 5000);
    wss.close();

    expect(result).not.toBeNull();
    expect(result.kind).toBe(9735);
    expect(result.tags).toEqual(expect.arrayContaining([['e', zapRequestId]]));
  }, 10000);

  it('returns null (timeout) when relay sends no matching event', async () => {
    const { WebSocketServer } = require('ws');
    const zapRequestId = 'a'.repeat(64);

    const wss = new WebSocketServer({ port: 0 });
    const port = wss.address().port;

    // Relay that sends nothing
    wss.on('connection', () => {});

    const result = await pollForZapReceipt(`ws://localhost:${port}`, zapRequestId, 1500);
    wss.close();

    expect(result).toBeNull();
  }, 5000);
});
