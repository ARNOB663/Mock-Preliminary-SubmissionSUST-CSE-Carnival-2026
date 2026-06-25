#!/usr/bin/env node
/**
 * Integration tests for the live API.
 *
 * Boots `next start` on a random port, waits for /api/health, runs end-to-end
 * cases against /api/sort-ticket, then shuts the server down.
 *
 * Run:  npm run test:integration
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";

const SECRET_REQUEST_PATTERN =
  /\b(share|send|provide|tell|give|forward|type|enter|reply with|message|whatsapp|sms)\b[^.\n!?]{0,80}?\b(otp|one[- ]time password|one time password|pin|password|passcode|cvv|cvc|card\s*number|card\s*no|full\s*card)\b/i;

const PORT = 4000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;

let server;

async function waitForHealth(timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {
      /* not ready yet */
    }
    await sleep(250);
  }
  return false;
}

before(async () => {
  // Direct invocation of next start via the local node_modules binary is
  // more reliable than `npx` (which can resolve to a different binary).
  const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Capture logs for diagnostics if the server fails to start
  let logBuf = "";
  server.stdout.on("data", (b) => (logBuf += b.toString()));
  server.stderr.on("data", (b) => (logBuf += b.toString()));

  const ready = await waitForHealth();
  if (!ready) {
    console.error("Server logs:\n" + logBuf);
  }
  assert.equal(ready, true, `server did not become healthy on ${BASE}`);
});

after(async () => {
  if (server && !server.killed) {
    server.kill("SIGTERM");
    await sleep(500);
    if (!server.killed) server.kill("SIGKILL");
  }
});

// ---------------------------------------------------------------------------
// /api/health
// ---------------------------------------------------------------------------

test("GET /api/health returns a healthy payload", async () => {
  const r = await fetch(`${BASE}/api/health`);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.status, "ok");
  assert.equal(body.service, "queue-storm-triage");
  assert.ok(typeof body.timestamp === "string" && body.timestamp.length > 10);
});

test("GET /api/health responds in under 10 seconds", async () => {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/health`);
  const dt = Date.now() - t0;
  assert.ok(dt < 10000, `health took ${dt}ms`);
  assert.equal(r.status, 200);
});

// ---------------------------------------------------------------------------
// /api/sort-ticket — spec §7 samples
// ---------------------------------------------------------------------------

async function post(payload) {
  const r = await fetch(`${BASE}/api/sort-ticket`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: r.status, body: await r.json() };
}

test("POST /api/sort-ticket: sample 1 wrong_transfer", async () => {
  const { status, body } = await post({
    ticket_id: "T-001",
    channel: "app",
    locale: "en",
    message: "I sent 3000 to wrong number",
  });
  assert.equal(status, 200);
  assert.equal(body.ticket_id, "T-001");
  assert.equal(body.case_type, "wrong_transfer");
  assert.equal(body.severity, "high");
  assert.equal(body.department, "dispute_resolution");
  assert.equal(body.human_review_required, false);
  assert.ok(typeof body.agent_summary === "string" && body.agent_summary.length > 0);
  assert.ok(body.confidence >= 0 && body.confidence <= 1);
});

test("POST /api/sort-ticket: sample 3 phishing is critical + human review", async () => {
  const { status, body } = await post({
    ticket_id: "T-003",
    message: "Someone called asking my OTP, is that bKash?",
  });
  assert.equal(status, 200);
  assert.equal(body.case_type, "phishing_or_social_engineering");
  assert.equal(body.severity, "critical");
  assert.equal(body.department, "fraud_risk");
  assert.equal(body.human_review_required, true);
  assert.equal(SECRET_REQUEST_PATTERN.test(body.agent_summary), false);
});

test("POST /api/sort-ticket: sample 4 refund low severity", async () => {
  const { status, body } = await post({
    ticket_id: "T-004",
    message: "Please refund my last transaction, I changed my mind",
  });
  assert.equal(status, 200);
  assert.equal(body.case_type, "refund_request");
  assert.equal(body.severity, "low");
});

test("POST /api/sort-ticket: Bangla input classifies correctly", async () => {
  const { status, body } = await post({
    ticket_id: "T-BN",
    locale: "bn",
    message: "আমি ভুল নম্বরে ৫০০০ টাকা পাঠিয়ে দিয়েছি",
  });
  assert.equal(status, 200);
  assert.equal(body.case_type, "wrong_transfer");
  assert.equal(body.severity, "high");
});

// ---------------------------------------------------------------------------
// /api/sort-ticket — validation
// ---------------------------------------------------------------------------

test("POST /api/sort-ticket: missing message → 400", async () => {
  const { status, body } = await post({ ticket_id: "T-X" });
  assert.equal(status, 400);
  assert.equal(body.field, "message");
  assert.ok(typeof body.error === "string" && body.error.length > 0);
});

test("POST /api/sort-ticket: missing ticket_id → 400", async () => {
  const { status, body } = await post({ message: "anything" });
  assert.equal(status, 400);
  assert.equal(body.field, "ticket_id");
});

test("POST /api/sort-ticket: invalid channel → 400", async () => {
  const { status } = await post({
    ticket_id: "T-Y",
    message: "anything",
    channel: "fax",
  });
  assert.equal(status, 400);
});

test("POST /api/sort-ticket: invalid JSON → 400", async () => {
  const r = await fetch(`${BASE}/api/sort-ticket`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not json",
  });
  assert.equal(r.status, 400);
});

// ---------------------------------------------------------------------------
// /api/sort-ticket — response time budget (30 s)
// ---------------------------------------------------------------------------

test("POST /api/sort-ticket: responds in under 30 seconds", async () => {
  const t0 = Date.now();
  const { status } = await post({
    ticket_id: "T-PERF",
    message: "I sent 5000 to wrong number please help",
  });
  const dt = Date.now() - t0;
  assert.equal(status, 200);
  assert.ok(dt < 30000, `sort-ticket took ${dt}ms`);
});