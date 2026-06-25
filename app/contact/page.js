export const metadata = { title: "Contact — TechHire" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tighter">Contact</h1>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        For support or partnership inquiries, email{" "}
        <a href="mailto:hello@techhire.bd" className="underline">hello@techhire.bd</a>.
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        For moderation reports (fake job postings, scams, abusive employers), email{" "}
        <a href="mailto:abuse@techhire.bd" className="underline">abuse@techhire.bd</a>.
      </p>
    </div>
  );
}