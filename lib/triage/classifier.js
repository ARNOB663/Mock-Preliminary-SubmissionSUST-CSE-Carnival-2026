/**
 * Rules-based ticket classifier.
 *
 * Pure function: takes the raw customer message (and optional locale/channel)
 * and returns a structured triage decision. No I/O, no LLM.
 *
 * Detection order matters:
 *   1. phishing_or_social_engineering  → critical + fraud_risk
 *   2. wrong_transfer                  → high    + dispute_resolution
 *   3. payment_failed                  → high    + payments_ops
 *   4. refund_request                  → low/med/high + customer_support / dispute_resolution
 *   5. other                           → low     + customer_support
 */

import {
  CASE_TYPES,
  SEVERITIES,
  DEPARTMENTS,
} from "./constants.js";
import {
  PHISHING_KEYWORDS,
  WRONG_TRANSFER_KEYWORDS,
  PAYMENT_FAILED_KEYWORDS,
  REFUND_KEYWORDS,
  URGENCY_KEYWORDS,
  REFUND_ESCALATION_KEYWORDS,
} from "./keywords.js";

/**
 * Normalize for keyword matching.
 *   - Lowercase ASCII (a-z) only; leaves Bangla characters untouched
 *   - Collapse whitespace and common punctuation noise
 *   - Convert common number-separator formats (5,000 / 5.000 / ৳-prefixed) to digits-only for amount extraction elsewhere
 */
export function normalize(text) {
  if (typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[‘’']/g, "'")
    .trim();
}

/**
 * Returns the list of keywords from `bundle` that appear in the normalized message.
 * Uses word-boundary matching for ASCII tokens; Bangla tokens use substring
 * match (since \b doesn't work on non-ASCII).
 */
function findHits(normalized, bundle) {
  const hits = [];
  for (const kw of bundle) {
    if (!kw) continue;
    const isAscii = /^[\x00-\x7f]+$/.test(kw);
    if (isAscii) {
      // Word boundary; allow s? on plurals for very common short words (e.g. "pin" / "pins")
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(normalized)) hits.push(kw);
    } else {
      // Bangla / non-ASCII: substring match
      if (normalized.includes(kw.toLowerCase())) hits.push(kw);
    }
  }
  return hits;
}

/**
 * Confidence in [0.5, 0.95].
 * More unique keyword hits → higher confidence, capped to avoid "perfect" 1.0.
 */
function computeConfidence(hitCount, overlap) {
  if (hitCount === 0) return 0.5;
  const base = 0.6 + Math.min(hitCount, 4) * 0.08; // 0.68 / 0.76 / 0.84 / 0.92
  const overlapBoost = Math.min(overlap, 2) * 0.02;
  return Math.min(0.95, Number((base + overlapBoost).toFixed(2)));
}

/**
 * Extracts an amount token (digits) and the longest digit run for use in summaries.
 * Returns { amount: string|null, rawDigits: string|null }
 */
export function extractAmount(text) {
  if (typeof text !== "string") return { amount: null, rawDigits: null };
  // Look for patterns like "5000 taka", "৳5,000", "bdt 3000", "tk 2,500.00", or just a digit run
  const amountMatch = text.match(
    /(?:taka|tk|bdt|৳)\s*([0-9][0-9,]*(?:\.[0-9]+)?)|([0-9]{2,}[,]?[0-9]*(?:\.[0-9]+)?)\s*(?:taka|tk|bdt)?/i
  );
  if (amountMatch) {
    const raw = (amountMatch[1] || amountMatch[2] || "").replace(/,/g, "").trim();
    if (raw) return { amount: raw, rawDigits: raw };
  }
  return { amount: null, rawDigits: null };
}

/**
 * Classify a customer message.
 *
 * @param {{ message: string, locale?: string, channel?: string }} input
 * @returns {{
 *   case_type: string,
 *   severity: string,
 *   department: string,
 *   human_review_required: boolean,
 *   confidence: number,
 *   signals: { phishing: string[], wrong_transfer: string[], payment_failed: string[], refund: string[] }
 * }}
 */
export function classify(input) {
  const message = (input && typeof input.message === "string" ? input.message : "");
  const normalized = normalize(message);

  const phishingHits = findHits(normalized, PHISHING_KEYWORDS);
  const wrongHits = findHits(normalized, WRONG_TRANSFER_KEYWORDS);
  const failedHits = findHits(normalized, PAYMENT_FAILED_KEYWORDS);
  const refundHits = findHits(normalized, REFUND_KEYWORDS);
  const urgencyHits = findHits(normalized, URGENCY_KEYWORDS);
  const refundEscalationHits = findHits(normalized, REFUND_ESCALATION_KEYWORDS);

  const signals = {
    phishing: phishingHits,
    wrong_transfer: wrongHits,
    payment_failed: failedHits,
    refund: refundHits,
  };

  // 1) Phishing — always critical, always escalate
  if (phishingHits.length > 0) {
    return {
      case_type: CASE_TYPES.PHISHING,
      severity: SEVERITIES.CRITICAL,
      department: DEPARTMENTS.FRAUD_RISK,
      human_review_required: true,
      confidence: computeConfidence(phishingHits.length, 0),
      signals,
    };
  }

  // 2) Wrong transfer — high, dispute resolution
  if (wrongHits.length > 0) {
    return {
      case_type: CASE_TYPES.WRONG_TRANSFER,
      severity: SEVERITIES.HIGH,
      department: DEPARTMENTS.DISPUTE_RESOLUTION,
      human_review_required: false,
      confidence: computeConfidence(wrongHits.length, 0),
      signals,
    };
  }

  // 3) Payment failed — high, payments ops
  if (failedHits.length > 0) {
    return {
      case_type: CASE_TYPES.PAYMENT_FAILED,
      severity: SEVERITIES.HIGH,
      department: DEPARTMENTS.PAYMENTS_OPS,
      human_review_required: false,
      confidence: computeConfidence(failedHits.length, 0),
      signals,
    };
  }

  // 4) Refund request — severity depends on urgency / escalation cues
  if (refundHits.length > 0) {
    let severity = SEVERITIES.MEDIUM;
    let department = DEPARTMENTS.CUSTOMER_SUPPORT;
    let humanReview = false;

    if (refundEscalationHits.length > 0) {
      // Customer alleges fraud / unauthorized / non-delivery → dispute resolution
      severity = SEVERITIES.HIGH;
      department = DEPARTMENTS.DISPUTE_RESOLUTION;
      humanReview = refundEscalationHits.some((k) =>
        ["fraud", "scammed", "unauthorized", "stolen"].includes(k.toLowerCase())
      );
    } else if (urgencyHits.length === 0) {
      // Plain refund, no urgency → low
      severity = SEVERITIES.LOW;
    }

    return {
      case_type: CASE_TYPES.REFUND_REQUEST,
      severity,
      department,
      human_review_required: humanReview,
      confidence: computeConfidence(refundHits.length, refundEscalationHits.length),
      signals,
    };
  }

  // 5) Other — low, customer support
  return {
    case_type: CASE_TYPES.OTHER,
    severity: SEVERITIES.LOW,
    department: DEPARTMENTS.CUSTOMER_SUPPORT,
    human_review_required: false,
    confidence: 0.5,
    signals,
  };
}