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
