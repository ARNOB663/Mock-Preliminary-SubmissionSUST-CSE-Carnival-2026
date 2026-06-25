import { NextResponse } from "next/server";
import { z } from "zod";

import { classify } from "@/lib/triage/classifier.js";
import { buildSummary } from "@/lib/triage/summary.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChannelEnum = z.enum(["app", "sms", "call_center", "merchant_portal"]);
const LocaleEnum = z.enum(["bn", "en", "mixed"]);

const BodySchema = z.object({
  ticket_id: z.string().trim().min(1, "ticket_id is required.").max(120),
  message: z.string().trim().min(1, "message is required.").max(4000),
  channel: ChannelEnum.optional(),
  locale: LocaleEnum.optional(),
});

/**
 * POST /api/sort-ticket
 *
 * Accepts a single CRM ticket JSON body and returns a structured triage
 * response. Public endpoint — no auth. Must respond within 30s.
 */
export async function POST(req) {
  let json;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: issue?.message ?? "Invalid input.",
        field: issue?.path?.[0] ?? null,
      },
      { status: 400 }
    );
  }

  const { ticket_id, message, channel, locale } = parsed.data;

  try {
    const classification = classify({ message, locale, channel });
    const agent_summary = buildSummary(
      message,
      classification.case_type,
      classification.severity
    );

    // Spec rule: human review required for critical OR phishing cases.
    const human_review_required =
      classification.human_review_required ||
      classification.severity === "critical" ||
      classification.case_type === "phishing_or_social_engineering";

    return NextResponse.json(
      {
        ticket_id,
        case_type: classification.case_type,
        severity: classification.severity,
        department: classification.department,
        agent_summary,
        human_review_required,
        confidence: classification.confidence,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[sort-ticket] failed:", err);
    return NextResponse.json(
      { error: "Triage failed.", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}