import Link from "next/link";

export const metadata = { title: "About — TechHire" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tighter">About TechHire</h1>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        TechHire is a job marketplace built specifically for tech hiring in Bangladesh.
        We focus on three audiences: students and junior developers looking for their
        next role, employers hiring across the stack, and a moderation team that keeps
        listings honest.
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Every employer is verified. Every job posting is reviewed. Every salary range is
        shown up front.
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        TechHire is built by the Reflexive Squirrels for the SUST CSE Carnival 2026
        hackathon, track: Building a Startup.
      </p>
      <Link href="/jobs" className="inline-block mt-4 underline text-sm">
        See open roles
      </Link>
    </div>
  );
}