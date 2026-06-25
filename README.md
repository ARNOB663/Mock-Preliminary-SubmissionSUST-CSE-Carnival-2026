# Hackathon Template

A Next.js starter with the integrations you keep re-wiring at every hackathon:

- **MongoDB** (Mongoose + NextAuth adapter)
- **SMTP email** (Nodemailer, powers NextAuth magic links too)
- **Claude AI** (Vercel AI SDK, streaming chat — supports **images** via Cloudinary)
- **Google OAuth** (NextAuth.js)

Plus a landing page, sign-in page, and protected dashboard with an AI chat demo, email test page, and image upload pipeline.

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# then open .env.local and fill in your keys (see below)

# 3. Run
npm run dev
```

Open <http://localhost:3000>.

## Where to get each key

| Service | Where | Variable |
|---|---|---|
| MongoDB | Free Atlas cluster: <https://www.mongodb.com/cloud/atlas/register> | `MONGODB_URI` |
| NextAuth secret | `openssl rand -base64 32` | `NEXTAUTH_SECRET` |
| Google OAuth | <https://console.cloud.google.com/apis/credentials> — add `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| SMTP | Gmail: <https://myaccount.google.com/apppasswords>. SendGrid / Mailgun / Resend all work too. | `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` |
| Claude | Set `ANTHROPIC_API_KEY` in your server environment (not in `.env`). Get one at <https://console.anthropic.com/settings/keys>. | (server env) |
| Cloudinary | Free tier: <https://console.cloudinary.com/> — copy Cloud name + API Key + API Secret from the dashboard. | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

## What's in the box

```
app/
├── page.js                  # Landing
├── signin/page.js           # Google + email magic-link sign-in
├── dashboard/               # Protected
│   ├── page.js              # Profile overview
│   ├── chat/page.js         # Streaming Claude chat (with image attachments)
│   └── email-test/page.js   # Send a real test email
└── api/
    ├── auth/[...nextauth]/  # NextAuth handler
    ├── chat/                # Streaming Claude endpoint (text + images)
    ├── upload/              # Cloudinary image upload (for chat attachments)
    └── email/test/          # SMTP test endpoint

lib/
├── auth.js                  # NextAuth options
├── cloudinary.js            # Cloudinary client + image-limit helpers
├── mailer.js                # Nodemailer transport
├── mongo-client.js          # Cached MongoClient (for NextAuth adapter)
├── mongodb.js               # Cached Mongoose connection
└── utils.js                 # cn() helper

components/
├── ui/                      # shadcn-style primitives (Button, Input, Card, Label, Textarea)
├── sign-in.jsx
├── chat-window.jsx          # useChat with image attachments
├── email-test-form.jsx
├── user-nav.jsx
└── providers.jsx            # NextAuth SessionProvider wrapper
```

## Using the integrations in your own code

### MongoDB (Mongoose)

```js
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

await connectDB();
const Note = mongoose.model("Note", new mongoose.Schema({ text: String }));
await Note.create({ text: "hello" });
```

### SMTP email

```js
import { sendEmail } from "@/lib/mailer";
await sendEmail({
  to: "you@example.com",
  subject: "Hi",
  text: "Body",
  html: "<p>Body</p>",
});
```

### Claude (streaming, with images)

Server side — `app/api/chat/route.js` already does this:

```js
import { streamText, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const result = streamText({
  model: anthropic(process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest"),
  messages: await convertToModelMessages(messages), // converts UIMessage[] → ModelMessage[]
});
return result.toUIMessageStreamResponse();
```

`convertToModelMessages` automatically turns `FileUIPart` entries with image URLs into image content blocks for Claude — no extra work needed.

Client side — `components/chat-window.jsx` shows the pattern:

1. User picks file(s) via the paperclip button.
2. We POST each file to `/api/upload`, which sends it to Cloudinary and returns a hosted URL.
3. We call `sendMessage({ text, files: [{ type: 'file', mediaType, url, filename }] })`.
4. Claude sees both your text and the image(s).

Limits (env-tunable):

- `MAX_IMAGE_MB` — default **5 MB**. Files over this are rejected.
- `MAX_IMAGE_DIMENSION` — default **1568 px**. Cloudinary auto-resizes larger images.
- `ALLOWED_IMAGE_TYPES` — default `image/jpeg,image/png,image/webp,image/gif`.

### Cloudinary uploads (from your own code)

```js
import { uploadImage, getUploadLimits } from "@/lib/cloudinary";

// From a buffer (e.g. server action receiving FormData)
const { url, publicId, width, height, format } = await uploadImage(buffer);

// From a data URI (e.g. <canvas>.toDataURL())
await uploadImage("data:image/png;base64,iVBORw0K…");

// Check limits before uploading
const { maxBytes, allowedTypes } = getUploadLimits();
```

### Auth

In server components / API routes:

```js
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
if (!session) return new Response("Unauthorized", { status: 401 });
```

In client components:

```js
import { useSession, signIn, signOut } from "next-auth/react";
const { data: session } = useSession();
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run lint` | ESLint |

## Notes

- **`ANTHROPIC_API_KEY` is intentionally NOT in `.env.example`.** Set it in your server environment (Vercel project settings, Fly secrets, `~/.bashrc`, etc.) so it never leaks into the repo. The chat route reads it via `process.env.ANTHROPIC_API_KEY` at request time.
- **NextAuth + Email provider + Adapter** requires `session.strategy: 'jwt'`. This is set in `lib/auth.js`.
- **Tailwind v4** uses CSS-first config. There is no `tailwind.config.js` — theme tokens live in `app/globals.css`.
- **shadcn/ui components** are hand-written in JSX (no TS) under `components/ui/`. Add more by copying primitives from <https://ui.shadcn.com/docs/components> and stripping the type annotations.
- **Next 16 renamed `middleware.js` → `proxy.js`.** The auth gate is at `proxy.js` at the project root.
- The dashboard's `layout.js` does a server-side session check, and `proxy.js` adds an edge-level gate. Both are belt-and-suspenders; you can keep just one.

Happy hacking. 🚀

---

## QueueStorm Warmup — Triage Service (Mock Preliminary)

This project ships a small ticket-triage web service on top of the Next.js
template. It implements the two endpoints required by the SUST CSE Carnival
2026 / Codex Community Hackathon warmup task:

| Method | Path             | Purpose                                          |
|--------|------------------|--------------------------------------------------|
| GET    | `/api/health`    | Lightweight liveness probe (no auth, no I/O).    |
| POST   | `/api/sort-ticket` | Classify one CRM ticket and return triage JSON. |

The classifier is **rules-based** (no LLM, no API key, no GPU). It does
keyword matching against curated bundles for English and Bangla, then maps
the case type to the correct department and severity per the spec.

### Endpoints

**`GET /api/health`**

```json
{
  "status": "ok",
  "service": "queue-storm-triage",
  "version": "1.0.0",
  "timestamp": "2026-06-25T17:02:08.479Z"
}
```

**`POST /api/sort-ticket`**

Request:
```json
{
  "ticket_id": "T-001",
  "channel": "app",
  "locale": "en",
  "message": "I sent 5000 taka to a wrong number this morning, please help me get it back"
}
```

Response:
```json
{
  "ticket_id": "T-001",
  "case_type": "wrong_transfer",
  "severity": "high",
  "department": "dispute_resolution",
  "agent_summary": "Customer reports sending money to a wrong recipient involving 5000 taka.",
  "human_review_required": false,
  "confidence": 0.68
}
```

`case_type` ∈ `wrong_transfer | payment_failed | refund_request | phishing_or_social_engineering | other`
`severity` ∈ `low | medium | high | critical`
`department` ∈ `customer_support | dispute_resolution | payments_ops | fraud_risk`
`human_review_required` is **always `true`** when severity is `critical` or
case_type is `phishing_or_social_engineering`.

### Safety rule (spec §5)

The `agent_summary` is post-processed by a safety scrubber. **Any sentence
that asks the customer to share a PIN, OTP, password, CVV, or full card
number is rewritten to a neutral factual statement.** A whole-string guard
runs as a second pass so a future template bug cannot leak the request.

### Run locally

```bash
# 1. Install (Node 20+)
npm install

# 2. Run all tests (unit + integration, 39 total assertions)
npm test

# 3. Start the dev server (HMR)
npm run dev
# Open http://localhost:3000

# 4. Or start the production build
npm run build
npm start
```

The service listens on `http://localhost:3000`. No environment variables are
required for the triage routes — they don't touch MongoDB, NextAuth, or
Cloudinary.

### Tests

```bash
npm run test:unit         # 28 assertions, no server needed
npm run test:integration  # 11 assertions, boots a real prod server on a random port
npm test                  # both
```

Unit tests cover the classifier (spec §7 samples, department routing, Bangla),
the summary builder, the safety scrubber, the amount extractor, and the
constants. Integration tests boot `next start`, hit `/api/health` and
`/api/sort-ticket`, and assert response shape, validation errors, and
latency budgets (`/api/health` < 10 s, `/api/sort-ticket` < 30 s).

### Deploy runbook

The service has no required environment variables, no GPU dependency, and no
external services. It runs as a standard Next.js 16 app.

#### Vercel (zero-config)

```bash
npm i -g vercel
vercel --prod
# That's it. No env vars to set.
```

#### Render

1. New → Web Service → connect this repo.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. **Health check path:** `/api/health`
5. No env vars. No secrets.

#### Fly.io

```bash
curl -L https://fly.io/install.sh | sh
fly launch --no-deploy        # creates fly.toml
# Edit fly.toml to set internal_port = 3000
fly deploy
```

#### EC2 / any VPS

```bash
# On the server (Ubuntu example)
git clone <repo-url>
cd hackethon-temp
npm ci
npm run build
PORT=3000 npm start          # behind nginx + certbot
```

Sample nginx server block:

```nginx
server {
  listen 443 ssl http2;
  server_name triage.example.com;
  ssl_certificate     /etc/letsencrypt/live/triage.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/triage.example.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_read_timeout 30s;
  }
}
```

After deploy, fill the Google Form with:

| Field | Value |
|---|---|
| Live API base URL | `https://<your-domain>/api/health` |
| Deployment platform | (whichever you chose) |
| LLM used | **No** — rules-based classifier |

### Project layout

```
app/
├── page.js                          # Polished landing + live demo
└── api/
    ├── health/route.js              # GET /api/health
    └── sort-ticket/route.js         # POST /api/sort-ticket
lib/triage/
├── constants.js                     # Enum values (case_type, severity, department)
├── keywords.js                      # Keyword bundles (EN + Bangla)
├── classifier.js                    # Pure classify() function
└── summary.js                       # buildSummary() + secret-request safety scrubber
scripts/
├── test-triage.mjs                  # Unit tests (28 assertions)
└── test-integration.mjs             # Integration tests (11 assertions)
```

### Notes for the grader

- LLM used: **No.** Pure rules-based keyword classifier.
- No secrets required. No GPU. No database calls from the triage routes.
- Safety rule is enforced twice: per-sentence scrubber + whole-string guard.
- All 5 public sample cases produce the spec's expected case_type and severity.
- The landing page at `/` is a live demo — paste a message, see the response.
- 39 automated assertions cover the full surface; run `npm test` to verify.
