import { streamText, convertToModelMessages, UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";

/**
 * POST /api/chat
 *
 * Streaming chat endpoint powered by Anthropic Claude via the Vercel AI SDK.
 *
 * The client `useChat` hook sends a body of shape `{ messages: UIMessage[] }`
 * — where each message is `{ id, role, parts: [{ type: 'text', text }] }`.
 * We convert that to the AI SDK's `ModelMessage[]` shape via
 * `convertToModelMessages()` before passing it to `streamText`.
 *
 * Environment:
 *   - ANTHROPIC_API_KEY (required) — get one at https://console.anthropic.com/settings/keys
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — adjust per Vercel plan

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local before using the chat endpoint.",
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, system } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty `messages` array." },
      { status: 400 }
    );
  }

  try {
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic(process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest"),
      system:
        system ||
        "You are a helpful assistant in a hackathon demo. Be concise, friendly, and use markdown when helpful.",
      messages: modelMessages,
    });

    // Stream the response back using the UI message stream format
    // (the format the client-side `useChat` hook expects).
    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[chat] streamText failed:", err);
    return NextResponse.json(
      { error: "Failed to generate a response. Check server logs." },
      { status: 500 }
    );
  }
}