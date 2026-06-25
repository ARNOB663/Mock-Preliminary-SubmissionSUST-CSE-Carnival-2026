import nodemailer from "nodemailer";

/**
 * Reusable Nodemailer transport. Lazily created so the app boots even
 * when SMTP env vars are missing.
 *
 * Configure via:
 *   EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD
 */
let cachedTransport = null;

export function getTransport() {
  if (cachedTransport) return cachedTransport;

  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP transport not configured. Set EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD in .env.local."
    );
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (TLS), false for 587 (STARTTLS)
    auth: { user, pass },
  });
  return cachedTransport;
}

/**
 * Send a transactional email.
 *
 * @param {{ to: string, subject: string, html?: string, text?: string }} opts
 */
export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransport();
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set.");

  const info = await transport.sendMail({ from, to, subject, html, text });
  return info;
}