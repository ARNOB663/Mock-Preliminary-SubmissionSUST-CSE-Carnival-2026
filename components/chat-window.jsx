"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip, X, Loader2 } from "lucide-react";

/**
 * Streaming chat window with image attachments. Uses the Vercel AI SDK's
 * `useChat` hook to talk to /api/chat.
 *
 * Image flow:
 *   1. User selects file(s) → we POST them to /api/upload.
 *   2. /api/upload sends them to Cloudinary and returns a hosted URL.
 *   3. We call `sendMessage({ text, files: [{ type: 'file', mediaType, url, filename }] })`.
 *   4. The server's `convertToModelMessages` includes those URLs as image
 *      content blocks for Claude.
 *
 * Limits (mirrored from .env):
 *   - MAX_IMAGE_MB (default 5) — enforced client-side too for fast feedback.
 *   - ALLOWED_IMAGE_TYPES (default image/jpeg,image/png,image/webp,image/gif)
 */
const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_IMAGE_MB) || 5;
const ALLOWED_TYPES = (
  process.env.NEXT_PUBLIC_ALLOWED_IMAGE_TYPES ||
  "image/jpeg,image/png,image/webp,image/gif"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function ChatWindow() {
  const { messages, sendMessage, status, error, stop } = useChat({
    id: "hackathon-chat",
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]); // [{ file, previewUrl, uploading, error }]
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onFileChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file
    const accepted = [];
    for (const file of files) {
      const type = (file.type || "").toLowerCase();
      if (!ALLOWED_TYPES.includes(type)) {
        accepted.push({ file, previewUrl: null, uploading: false, error: `Unsupported type: ${type}` });
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        accepted.push({
          file,
          previewUrl: null,
          uploading: false,
          error: `Too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max ${MAX_MB} MB)`,
        });
        continue;
      }
      accepted.push({
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: false,
        error: null,
      });
    }
    setPendingFiles((prev) => [...prev, ...accepted]);
  }

  function removePending(idx) {
    setPendingFiles((prev) => {
      const next = prev.slice();
      const removed = next.splice(idx, 1)[0];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  async function uploadAll() {
    setPendingFiles((prev) => prev.map((p) => ({ ...p, uploading: true, error: null })));
    const uploaded = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const p = pendingFiles[i];
      if (p.error) {
        uploaded.push({ ...p, uploading: false });
        continue;
      }
      try {
        const fd = new FormData();
        fd.append("file", p.file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        uploaded.push({ ...p, uploading: false, uploaded: data });
      } catch (err) {
        uploaded.push({ ...p, uploading: false, error: err.message });
      }
      setPendingFiles((prev) => {
        const next = prev.slice();
        next[i] = uploaded[i];
        return next;
      });
    }
    return uploaded;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status !== "ready") return;
    if (pendingFiles.length === 0) {
      sendMessage({ text });
      setInput("");
      return;
    }

    const uploaded = await uploadAll();
    const files = uploaded
      .filter((u) => u.uploaded)
      .map((u) => ({
        type: "file",
        mediaType: u.file.type || "image/jpeg",
        url: u.uploaded.url,
        filename: u.file.name,
      }));

    sendMessage({ text, files });

    // Cleanup previews
    for (const u of uploaded) {
      if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
    }
    setPendingFiles([]);
    setInput("");
  }

  const isStreaming = status === "submitted" || status === "streaming";
  const anyUploading = pendingFiles.some((p) => p.uploading);

  return (
    <Card className="flex flex-col h-[70vh]">
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-sm py-12">
            Start the conversation. Try:{" "}
            <em>&quot;What&apos;s in this image?&quot;</em> (attach an image first).
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} parts={m.parts} />
        ))}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
            {error.message || "Something went wrong."}
          </div>
        )}

        <div ref={bottomRef} />
      </CardContent>

      <div className="border-t border-zinc-200 dark:border-zinc-800 p-3">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingFiles.map((p, i) => (
              <div
                key={i}
                className="relative h-16 w-16 rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center"
                title={p.file?.name || p.error}
              >
                {p.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.previewUrl} alt="" className="object-cover h-full w-full" />
                ) : (
                  <span className="text-[10px] text-red-600 px-1 text-center leading-tight">
                    {p.error || "?"}
                  </span>
                )}
                {p.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                )}
                {!p.uploading && (
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    className="absolute top-0 right-0 bg-black/60 hover:bg-black/80 text-white rounded-bl-md p-0.5"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            onChange={onFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            title="Attach image"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder={pendingFiles.length > 0 ? "Describe the image(s)… (Enter to send)" : "Ask Claude anything… (Enter to send, Shift+Enter for newline)"}
            rows={2}
            className="resize-none"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button type="button" variant="outline" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim() || anyUploading}
            >
              Send
            </Button>
          )}
        </form>
      </div>
    </Card>
  );
}

function MessageBubble({ role, parts }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm space-y-2 ${
          isUser
            ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wider opacity-60">
          {isUser ? "You" : "Claude"}
        </div>

        {/* Render image attachments for user messages */}
        {isUser && Array.isArray(parts) && parts.some((p) => p.type === "file") && (
          <div className="flex flex-wrap gap-2">
            {parts
              .filter((p) => p.type === "file" && p.mediaType?.startsWith("image/"))
              .map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p.url}
                  alt={p.filename || "attached"}
                  className="rounded-md max-h-48 max-w-[200px] object-cover"
                />
              ))}
          </div>
        )}

        {/* Render text */}
        {Array.isArray(parts) &&
          parts
            .filter((p) => p.type === "text")
            .map((p, i) => (
              <span key={i} className="whitespace-pre-wrap block">
                {p.text}
              </span>
            ))}
      </div>
    </div>
  );
}