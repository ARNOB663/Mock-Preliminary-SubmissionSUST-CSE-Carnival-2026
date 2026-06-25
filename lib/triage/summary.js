/**
 * One-sentence agent summary builder.
 *
 * CRITICAL SAFETY RULE (from spec §5):
 *   The summary must NEVER ask the customer to share a PIN, OTP, password,
 *   or full card number. Any response that does fails that test case.
 *
 * Implementation:
 *   1. Build the summary from a neutral template (no request verbs to start).
 *   2. Run a post-generation safety scrubber over every sentence; rewrite
 *      any sentence that asks for credentials.
 *   3. Run a final whole-string guard so even a future template bug cannot
 *      leak the request.
 */

import { CASE_TYPES, SEVERITIES } from "./constants.js";
import { extractAmount } from "./classifier.js";

const SECRET_REQUEST_PATTERN =
  /\b(share|send|provide|tell|give|forward|type|enter|reply with|message|whatsapp|sms)\b[^.\n!?]{0,80}?\b(otp|one[- ]time password|one time password|pin|password|passcode|cvv|cvc|card\s*number|card\s*no|full\s*card)\b/i;

const SECRET_NOUN_PATTERN =
  /\b(otp|one[- ]time password|one time password|pin|password|passcode|cvv|cvc|card\s*number|card\s*no|full\s*card)\b/i;

/**
 * Splits a string into sentences while preserving the original substrings.
 */
function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Truncates a string to maxLen characters, breaking on a word boundary if possible.
 */
function clamp(text, maxLen = 240) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd() + "...";
}

/**
 * Replaces any sentence that asks the customer to share a secret with a safe
 * factual restatement. Returns the cleaned summary string.
 */
function scrubSecretRequests(summary) {
  const sentences = splitSentences(summary);
  const cleaned = sentences.map((sentence) => {
    if (SECRET_REQUEST_PATTERN.test(sentence)) {
      // Strip the request verb phrase and replace with a neutral reporting sentence.
      // Keep any factual lead-in up to the verb if present.
      const leadMatch = sentence.match(/^([^.]*?)\b(?:please|kindly|plz)?\s*$/i);
      return (
        (leadMatch && leadMatch[1] && leadMatch[1].trim().length > 12
          ? leadMatch[1].trim() + " "
          : "") +
        "Customer reported a potential social-engineering attempt asking for their credentials."
      );
    }
    return sentence;
  });
  return cleaned.join(" ");
}

/**
 * Final whole-string guard: if a dangerous request phrase still exists anywhere
 * (e.g. across sentence boundaries), rewrite the summary to a safe fallback.
 */
function ensureSafe(summary, fallback) {
  if (SECRET_REQUEST_PATTERN.test(summary)) return fallback;
  return summary;
}

const PHRASE_BY_TYPE = {
  [CASE_TYPES.WRONG_TRANSFER]: "Customer reports sending money to a wrong recipient",
  [CASE_TYPES.PAYMENT_FAILED]: "Customer reports a failed transaction",
  [CASE_TYPES.REFUND_REQUEST]: "Customer is requesting a refund",
  [CASE_TYPES.PHISHING]:
    "Customer reported a possible social-engineering or phishing attempt",
  [CASE_TYPES.OTHER]: "Customer submitted a support request",
};

/**
 * Build a 1–2 sentence neutral summary for the agent.
 *
 * @param {string} message  Raw customer message (any language).
 * @param {string} caseType One of CASE_TYPES.
 * @param {string} severity One of SEVERITIES.
 * @returns {string}
 */
export function buildSummary(message, caseType, severity) {
  const safeMessage = typeof message === "string" ? message.trim() : "";
  const { amount } = extractAmount(safeMessage);

  const lead = PHRASE_BY_TYPE[caseType] || "Customer submitted a support request";

  // Amount detail (if extractable). Bangla amount text is left intact via "amount taka".
  let detail = "";
  if (amount) {
    detail = ` involving ${amount} taka`;
  }

  let sentence =
    `${lead}${detail}.` +
    (caseType === CASE_TYPES.PHISHING
      ? " Treat as fraud risk and do not request credentials from the customer."
      : severity === SEVERITIES.CRITICAL
        ? " Marked as critical and requires immediate human review."
        : "");

  // If the original message contains a customer-quoted secret ask, preserve
  // that fact in the summary without echoing a request to share.
  if (caseType === CASE_TYPES.PHISHING && SECRET_NOUN_PATTERN.test(safeMessage)) {
    sentence +=
      " The customer described an inbound request for their OTP, PIN, or password.";
  }

  sentence = clamp(sentence, 280);

  // Safety passes
  sentence = scrubSecretRequests(sentence);
  sentence = ensureSafe(
    sentence,
    "Customer submitted a support request. Escalate as required."
  );

  return sentence;
}