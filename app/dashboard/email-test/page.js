import { EmailTestForm } from "@/components/email-test-form";

export const metadata = { title: "Email Test — Hackathon Template" };

export default function EmailTestPage() {
  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email Test</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Send a real email through your SMTP server. Useful for verifying
          <code className="mx-1 text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">EMAIL_SERVER_*</code>
          configuration.
        </p>
      </div>
      <EmailTestForm />
    </div>
  );
}