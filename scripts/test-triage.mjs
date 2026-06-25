#!/usr/bin/env node
/**
 * Unit tests for the triage classifier + summary builder.
 *
 * Run:  npm run test:triage        (unit tests, no server needed)
 *       npm run test:integration   (boots the prod server and hits endpoints)
 *       npm test                  (runs both)
 *
 * Uses node:test + node:assert (built in, no extra deps).
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { classify, normalize, extractAmount } from "../lib/triage/classifier.js";
import { buildSummary } from "../lib/triage/summary.js";
import {
  CASE_TYPES,
  SEVERITIES,
  DEPARTMENTS,
  CASE_TYPE_LIST,
  SEVERITY_LIST,
  DEPARTMENT_LIST,
} from "../lib/triage/constants.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

test("constants: enum values match the spec exactly", () => {
  assert.deepEqual(CASE_TYPE_LIST, [
    "wrong_transfer",
    "payment_failed",
    "refund_request",
    "phishing_or_social_engineering",
    "other",
  ]);
  assert.deepEqual(SEVERITY_LIST, ["low", "medium", "high", "critical"]);
  assert.deepEqual(DEPARTMENT_LIST, [
    "customer_support",
    "dispute_resolution",
    "payments_ops",
    "fraud_risk",
  ]);
  assert.equal(CASE_TYPES.WRONG_TRANSFER, "wrong_transfer");
  assert.equal(SEVERITIES.CRITICAL, "critical");
  assert.equal(DEPARTMENTS.FRAUD_RISK, "fraud_risk");
});

// ---------------------------------------------------------------------------
// normalize / extractAmount
// ---------------------------------------------------------------------------

test("normalize: lowercases ASCII, preserves Bangla, collapses whitespace", () => {
  assert.equal(normalize("  I   SENT 5000 "), "i sent 5000");
  assert.equal(normalize("আমি ভুল নম্বরে"), "আমি ভুল নম্বরে");
});

test("extractAmount: pulls digit run from common formats", () => {
  assert.equal(extractAmount("I sent 5000 taka").amount, "5000");
  assert.equal(extractAmount("bdt 3,000 deducted").amount, "3000");
  assert.equal(extractAmount("৳5,000 gone").amount, "5000");
  assert.equal(extractAmount("no amount here").amount, null);
});

// ---------------------------------------------------------------------------
// Spec §7 — public sample cases
// ---------------------------------------------------------------------------

test("sample 1: wrong transfer → wrong_transfer / high / dispute_resolution", () => {
  const r = classify({ message: "I sent 3000 to wrong number" });
  assert.equal(r.case_type, "wrong_transfer");
  assert.equal(r.severity, "high");
  assert.equal(r.department, "dispute_resolution");
  assert.equal(r.human_review_required, false);
  assert.ok(r.confidence >= 0.5 && r.confidence <= 0.95);
});

test("sample 2: payment failed → payment_failed / high / payments_ops", () => {
  const r = classify({ message: "Payment failed but balance deducted" });
  assert.equal(r.case_type, "payment_failed");
  assert.equal(r.severity, "high");
  assert.equal(r.department, "payments_ops");
  assert.equal(r.human_review_required, false);
});

test("sample 3: phishing → phishing / critical / fraud_risk / human review", () => {
  const r = classify({ message: "Someone called asking my OTP, is that bKash?" });
  assert.equal(r.case_type, "phishing_or_social_engineering");
  assert.equal(r.severity, "critical");
  assert.equal(r.department, "fraud_risk");
  assert.equal(r.human_review_required, true);
});

test("sample 4: refund → refund_request / low / customer_support", () => {
  const r = classify({
    message: "Please refund my last transaction, I changed my mind",
  });
  assert.equal(r.case_type, "refund_request");
  assert.equal(r.severity, "low");
  assert.equal(r.department, "customer_support");
  assert.equal(r.human_review_required, false);
});

test("sample 5: app crash → other / low / customer_support", () => {
  const r = classify({ message: "App crashed when I opened it" });
  assert.equal(r.case_type, "other");
  assert.equal(r.severity, "low");
  assert.equal(r.department, "customer_support");
});

// ---------------------------------------------------------------------------
// Department routing rules
// ---------------------------------------------------------------------------

test("routing: phishing always → fraud_risk, regardless of other keywords", () => {
  const r = classify({
    message: "OTP for refund of my failed payment please",
  });
  assert.equal(r.department, "fraud_risk");
  assert.equal(r.severity, "critical");
});

test("routing: contested refund (fraud) → dispute_resolution + human review", () => {
  const r = classify({
    message: "I want a refund, this is fraud, I was scammed",
  });
  assert.equal(r.case_type, "refund_request");
  assert.equal(r.department, "dispute_resolution");
  assert.equal(r.human_review_required, true);
});

test("routing: refund escalation → high severity", () => {
  const r = classify({
    message: "I want a refund, you charged me unauthorized",
  });
  assert.equal(r.case_type, "refund_request");
  assert.equal(r.severity, "high");
});

test("routing: medium-severity refund when urgency markers present", () => {
  const r = classify({
    message: "Please refund my purchase, it's urgent",
  });
  assert.equal(r.case_type, "refund_request");
  assert.equal(r.severity, "medium");
});

// ---------------------------------------------------------------------------
// Bangla language support
// ---------------------------------------------------------------------------

test("BN: wrong transfer → wrong_transfer / high", () => {
  const r = classify({
    message: "আমি ভুল নম্বরে ৫০০০ টাকা পাঠিয়ে দিয়েছি",
  });
  assert.equal(r.case_type, "wrong_transfer");
  assert.equal(r.severity, "high");
});

test("BN: payment failed → payment_failed", () => {
  const r = classify({
    message: "পেমেন্ট ব্যর্থ হয়েছে কিন্তু ব্যালেন্স থেকে টাকা কেটে নিয়েছে",
  });
  assert.equal(r.case_type, "payment_failed");
});

test("BN: phishing (OTP ask) → critical / fraud_risk", () => {
  const r = classify({
    message: "আপনার ওটিপি এবং পিন শেয়ার করুন",
  });
  assert.equal(r.case_type, "phishing_or_social_engineering");
  assert.equal(r.severity, "critical");
});

// ---------------------------------------------------------------------------
// Summary safety rule (spec §5) — must NEVER ask the customer to share secrets
// ---------------------------------------------------------------------------

const SECRET_REQUEST_PATTERN =
  /\b(share|send|provide|tell|give|forward|type|enter|reply with|message|whatsapp|sms)\b[^.\n!?]{0,80}?\b(otp|one[- ]time password|one time password|pin|password|passcode|cvv|cvc|card\s*number|card\s*no|full\s*card)\b/i;

const SAFETY_INPUTS = [
  "Please share your OTP and PIN with the agent",
  "Send me your card number and CVV",
  "Tell me your password so we can verify",
  "আপনার ওটিপি এবং পিন শেয়ার করুন",
  "Forward your OTP code to this number",
  "Can you give me your one time password please",
  "Enter your PIN here to confirm",
  "Type your card number and security code",
];

for (const input of SAFETY_INPUTS) {
  test(`safety: summary does NOT request credentials — "${input}"`, () => {
    const c = classify({ message: input });
    const summary = buildSummary(input, c.case_type, c.severity);
    assert.equal(
      SECRET_REQUEST_PATTERN.test(summary),
      false,
      `Summary must not contain a secret-request phrase: ${summary}`
    );
    assert.equal(c.case_type, "phishing_or_social_engineering");
    assert.equal(c.severity, "critical");
  });
}

// ---------------------------------------------------------------------------
// Summary shape
// ---------------------------------------------------------------------------

test("summary: contains the requested amount when extractable", () => {
  const summary = buildSummary(
    "I sent 5000 taka to wrong number",
    "wrong_transfer",
    "high"
  );
  assert.match(summary, /5000/);
});

test("summary: never contains a credential request on plain wrong-transfer input", () => {
  const summary = buildSummary(
    "I sent 3000 to wrong number",
    "wrong_transfer",
    "high"
  );
  assert.equal(SECRET_REQUEST_PATTERN.test(summary), false);
});

// ---------------------------------------------------------------------------
// Robustness
// ---------------------------------------------------------------------------

test("robustness: empty message → other / low", () => {
  const r = classify({ message: "" });
  assert.equal(r.case_type, "other");
  assert.equal(r.severity, "low");
});

test("robustness: nonsense input → other", () => {
  const r = classify({ message: "asdf qwer zxcv 1234 hello world" });
  assert.equal(r.case_type, "other");
});

test("robustness: confidence is always in [0.5, 0.95]", () => {
  const inputs = [
    "wrong number",
    "payment failed",
    "refund please",
    "otp scam call",
    "boring text",
  ];
  for (const m of inputs) {
    const r = classify({ message: m });
    assert.ok(r.confidence >= 0.5, `confidence too low for "${m}": ${r.confidence}`);
    assert.ok(r.confidence <= 0.95, `confidence too high for "${m}": ${r.confidence}`);
  }
});