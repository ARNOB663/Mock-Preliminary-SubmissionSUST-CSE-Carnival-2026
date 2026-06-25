import { ChatWindow } from "@/components/chat-window";

export const metadata = { title: "AI Chat — Hackathon Template" };

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Chat</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Streaming responses powered by Claude via the Vercel AI SDK.
        </p>
      </div>
      <ChatWindow />
    </div>
  );
}