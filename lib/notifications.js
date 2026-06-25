import { connectDB } from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import { sendEmail } from "@/lib/mailer";

/**
 * Create an in-app notification + (optionally) send an email.
 *
 * @param {object} args
 * @param {string} args.userId     — recipient user _id
 * @param {string} args.type       — Notification.type enum
 * @param {string} args.title      — short title
 * @param {string} args.body       — 1-2 sentence body
 * @param {string} [args.link]     — relative URL to open in app
 * @param {string} [args.email]    — recipient email (if also sending email)
 * @param {string} [args.emailSubject]
 * @param {string} [args.emailHtml]
 * @returns {Promise<object|null>} — created notification, or null if user missing
 */
export async function notify({
  userId,
  type,
  title,
  body,
  link = null,
  email = null,
  emailSubject = null,
  emailHtml = null,
}) {
  if (!userId || !type || !title) return null;
  try {
    await connectDB();
    const doc = await Notification.create({ userId, type, title, body, link });

    if (email && emailSubject && emailHtml) {
      // Best-effort — email failure should not break the caller.
      sendEmail({ to: email, subject: emailSubject, html: emailHtml }).catch(
        (err) => console.error("[notify] email failed:", err?.message)
      );
    }

    return doc;
  } catch (err) {
    console.error("[notify] failed:", err?.message);
    return null;
  }
}