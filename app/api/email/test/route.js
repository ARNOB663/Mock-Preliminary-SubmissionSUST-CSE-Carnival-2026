import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/mailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/email/test
 *
 * Sends a transactional email via SMTP for testing the mailer config.
 * Body: { to: string, subject: string, body: string }
 *
 * Protected — only signed-in users can send (so spam-bots can't abuse it
 * during demos). Remove the getServerSession block if you want it open.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  to: z.string().email("Recipient must be a valid email address."),
  subject: z.string().min(1, "Subject is required.").max(200),
  body: z.string().min(1, "Body is required.").max(5000),
});

export async function POST(req) {
  // Optional auth gate — comment out if you don't want to require sign-in.
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let json;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { to, subject, body } = parsed.data;

  try {
    const html = `
      <div style="font-family: -apple-system, system-ui, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 16px;">${escapeHtml(subject)}</h2>
        <p style="white-space: pre-wrap;">${escapeHtml(body)}</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #888; font-size: 12px;">
          Sent from the Hackathon Template email test page by ${escapeHtml(session.user.email ?? "anonymous")}.
        </p>
      </div>
    `;
    const info = await sendEmail({ to, subject, html, text: body });
    return NextResponse.json({ ok: true, id: info.messageId ?? null });
  } catch (err) {
    console.error("[email/test] send failed:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to send email." },
      { status: 500 }
    );
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}