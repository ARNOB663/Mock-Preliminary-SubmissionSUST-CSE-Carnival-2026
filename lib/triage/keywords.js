/**
 * Keyword bundles for each case_type.
 *
 * Each entry is an array of lowercase needles. Bangla needles are kept as-is;
 * the classifier normalizes the message by lowercasing only ASCII so Bangla
 * characters still match.
 *
 * Phishing is checked FIRST because it overrides every other detection.
 */

export const PHISHING_KEYWORDS = [
  // OTP / PIN / password / CVV / card number — the classic social-engineering asks
  "otp",
  "o.t.p",
  "one time password",
  "one-time password",
  "pin",
  "password",
  "passcode",
  "cvv",
  "card number",
  "card no",
  "credit card",
  "debit card",
  // "share your code" style
  "share your",
  "send your code",
  "send your otp",
  "give your pin",
  "tell me your",
  "verification code",
  "security code",
  // common impersonation patterns in BD mobile money
  "bkash",
  "nagad",
  "rocket",
  "upay",
  "surecash",
  // scam phrases
  "you have won",
  "claim your prize",
  "lottery",
  "click the link",
  "verify your account",
  "kyc update",
  "reactivate",
  // bangla
  "ওটিপি",
  "পিন",
  "পাসওয়ার্ড",
  "কোড দিন",
  "কোড পাঠান",
  "কার্ড নম্বর",
  "জরুরি ভেরিফাই",
];

export const WRONG_TRANSFER_KEYWORDS = [
  "wrong number",
  "wrong recipient",
  "sent to wrong",
  "sent by mistake",
  "sent to the wrong",
  "wrong account",
  "wrong person",
  "mistakenly sent",
  "accidentally sent",
  "sent by accident",
  "incorrect number",
  "transferred to wrong",
  "paid to wrong",
  "money to a wrong",
  // bangla
  "ভুল নম্বরে",
  "ভুল একাউন্টে",
  "ভুল নম্বর",
  "ভুল ব্যক্তি",
  "ভুল করে পাঠিয়েছি",
];

export const PAYMENT_FAILED_KEYWORDS = [
  "payment failed",
  "transaction failed",
  "transaction unsuccessful",
  "failed transaction",
  "transaction declined",
  "declined",
  "balance deducted",
  "money deducted",
  "amount deducted",
  "charged but",
  "deducted but",
  "debited but",
  "not received",
  "didn't receive",
  "did not receive",
  "not credited",
  "money not received",
  "pending transaction",
  "stuck transaction",
  "double charge",
  "double charged",
  "double payment",
  // bangla
  "পেমেন্ট ব্যর্থ",
  "টাকা কেটে নিয়েছে",
  "কাটা হয়েছে",
  "কেটে গেছে",
  "পেমেন্ট হয়নি",
  "লেনদেন ব্যর্থ",
];

export const REFUND_KEYWORDS = [
  "refund",
  "refund request",
  "please refund",
  "want a refund",
  "want my money back",
  "money back",
  "return my money",
  "return the money",
  "cancel my order",
  "cancel order",
  "i changed my mind",
  "changed my mind",
  "didn't want",
  "did not want",
  "duplicate charge",
  "charged twice",
  // bangla
  "ফেরত",
  "টাকা ফেরত",
  "রিফান্ড",
  "ফেরত দিন",
];

export const URGENCY_KEYWORDS = [
  "urgent",
  "immediately",
  "asap",
  "right now",
  "emergency",
  "blocked",
  "account blocked",
  "locked",
  "scammed",
  "fraud",
  "stolen",
  "lost money",
  "huge amount",
  // bangla
  "জরুরি",
  "এখনই",
  "স্ক্যাম",
];

export const REFUND_ESCALATION_KEYWORDS = [
  "scammed",
  "fraud",
  "stolen",
  "lost money",
  "didn't receive the product",
  "did not receive the product",
  "product not delivered",
  "service not provided",
  "charged without consent",
  "unauthorized",
  "fraudulent",
];

/**
 * Patterns that indicate the ticket is *describing* a phishing attempt
 * (vs the customer being phished themselves). Used to distinguish cases
 * where we should escalate as critical fraud risk.
 *
 * Note: every phishing match is treated as critical per spec
 * (human_review_required=true).
 */