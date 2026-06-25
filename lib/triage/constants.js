/**
 * Single source of truth for triage enum values.
 * Keep in sync with the QueueStorm Warmup spec.
 */

export const CASE_TYPES = Object.freeze({
  WRONG_TRANSFER: "wrong_transfer",
  PAYMENT_FAILED: "payment_failed",
  REFUND_REQUEST: "refund_request",
  PHISHING: "phishing_or_social_engineering",
  OTHER: "other",
});

export const SEVERITIES = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
});

export const DEPARTMENTS = Object.freeze({
  CUSTOMER_SUPPORT: "customer_support",
  DISPUTE_RESOLUTION: "dispute_resolution",
  PAYMENTS_OPS: "payments_ops",
  FRAUD_RISK: "fraud_risk",
});

export const CASE_TYPE_LIST = Object.values(CASE_TYPES);
export const SEVERITY_LIST = Object.values(SEVERITIES);
export const DEPARTMENT_LIST = Object.values(DEPARTMENTS);