export const metadata = { title: "Privacy — TechHire" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tighter">Privacy policy</h1>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        We collect the minimum data needed to operate the marketplace: your name, email,
        the profile fields you fill in, and your applications.
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        We never sell your data. Employers only see what you choose to attach to an
        application.
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        To delete your account and data, sign in and visit{" "}
        <a href="/dashboard/settings" className="underline">Account settings</a>.
      </p>
    </div>
  );
}