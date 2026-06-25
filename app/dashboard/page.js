import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard — Hackathon Template" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          You're signed in. Try the AI chat or send a test email below.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Information from your session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Name" value={user?.name ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="User ID" value={user?.id ?? "—"} mono />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/dashboard/chat"
          className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 hover:border-zinc-400 dark:hover:border-zinc-600 transition"
        >
          <h3 className="font-semibold">AI Chat →</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Stream responses from Claude.
          </p>
        </a>
        <a
          href="/dashboard/email-test"
          className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 hover:border-zinc-400 dark:hover:border-zinc-600 transition"
        >
          <h3 className="font-semibold">Email Test →</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Send a real email through your SMTP server.
          </p>
        </a>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-zinc-500">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}