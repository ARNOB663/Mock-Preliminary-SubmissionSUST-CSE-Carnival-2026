export const metadata = { title: "Terms — TechHire" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tighter">Terms of use</h1>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        By using TechHire you agree to provide accurate information in your profile and
        job postings, and to communicate respectfully with other users.
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Job postings that misrepresent the role, salary, or company will be removed.
        Repeat offenders will be banned.
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        This is a hackathon project, not a production product. We make no guarantees
        about uptime or data retention.
      </p>
    </div>
  );
}