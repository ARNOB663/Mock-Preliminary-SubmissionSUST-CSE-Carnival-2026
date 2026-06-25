import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Mail, Sparkles, KeyRound } from "lucide-react";

const features = [
  {
    icon: KeyRound,
    title: "Google OAuth + Magic Links",
    body: "NextAuth.js with Google and email providers, sessions stored in MongoDB.",
  },
  {
    icon: Database,
    title: "MongoDB Ready",
    body: "Mongoose + MongoDB adapter pre-wired. Drop in your MONGODB_URI and go.",
  },
  {
    icon: Mail,
    title: "SMTP Email",
    body: "Nodemailer transport for transactional emails and passwordless sign-in.",
  },
  {
    icon: Sparkles,
    title: "Claude Streaming",
    body: "AI SDK v7 streaming chat endpoint powered by Anthropic Claude.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-lg">
            Hackathon Template
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/signin">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight">
            Ship your hackathon project <span className="text-zinc-500">faster</span>.
          </h1>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            A Next.js starter with MongoDB, SMTP email, Claude AI, and Google OAuth
            already wired up. Clone, fill in your <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">.env.local</code>,
            and start hacking.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg">Open Dashboard</Button>
            </Link>
            <Link href="/signin">
              <Button variant="outline" size="lg">Sign in</Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="rounded-md bg-zinc-100 dark:bg-zinc-800 p-2">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{f.body}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-zinc-500 flex justify-between">
          <span>Hackathon Template</span>
          <span>Built with Next.js</span>
        </div>
      </footer>
    </div>
  );
}