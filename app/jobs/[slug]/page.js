import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";

export async function generateMetadata({ params }) {
  return { title: `${params.slug} — TechHire` };
}

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }) {
  let job = null;
  try {
    await connectDB();
    job = await Job.findOne({ slug: params.slug, status: "active" })
      .populate("companyId", "name slug logo verified website location industry size description")
      .populate("employerId", "name")
      .lean();
  } catch {}

  if (!job) notFound();

  // Fire-and-forget view increment.
  try {
    await Job.updateOne({ _id: job._id }, { $inc: { views: 1 } });
  } catch {}

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/jobs" className="font-semibold tracking-tight">TechHire</Link>
          <Link
            href="/signup"
            className="px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12 grid md:grid-cols-12 gap-10">
        <article className="md:col-span-8 space-y-8">
          <header className="space-y-3">
            <div className="text-sm text-zinc-500">
              <Link href={`/companies/${job.companyId?.slug}`} className="hover:underline">
                {job.companyId?.name}
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-tight">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span>{job.location || "Remote"}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span>{job.jobType.replace("_", " ")}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span>{job.experienceLevel} level</span>
              {job.applicationDeadline && (
                <>
                  <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span>Closes {new Date(job.applicationDeadline).toLocaleDateString()}</span>
                </>
              )}
            </div>
            {job.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {job.skills.map((s) => (
                  <span key={s} className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </header>

          <Section title="Description">
            <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {job.description}
            </div>
          </Section>

          {job.responsibilities?.length > 0 && (
            <Section title="Responsibilities">
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-700 dark:text-zinc-300">
                {job.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </Section>
          )}

          {job.requirements?.length > 0 && (
            <Section title="Requirements">
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-700 dark:text-zinc-300">
                {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </Section>
          )}
        </article>

        <aside className="md:col-span-4 space-y-4 md:sticky md:top-24 self-start">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
            <Link
              href={`/signup?role=job_seeker&next=${encodeURIComponent(`/dashboard/jobs/${job.slug}/apply`)}`}
              className="block w-full text-center rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Apply now
            </Link>
            <div className="space-y-2 text-sm">
              {job.salary?.min && (
                <Row label="Salary">
                  {job.salary.currency || "BDT"} {job.salary.min.toLocaleString()}
                  {job.salary.max ? ` – ${job.salary.max.toLocaleString()}` : ""}
                  {job.salary.negotiable && " (negotiable)"}
                </Row>
              )}
              <Row label="Type">{job.jobType.replace("_", " ")}</Row>
              <Row label="Level">{job.experienceLevel}</Row>
              <Row label="Location">{job.location || "Remote"}</Row>
              {job.isRemote && <Row label="Remote"><span className="text-emerald-600 dark:text-emerald-400">Open to remote</span></Row>}
            </div>
          </div>

          {job.companyId && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{job.companyId.name}</span>
                {job.companyId.verified && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    Verified
                  </span>
                )}
              </div>
              {job.companyId.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">{job.companyId.description}</p>
              )}
              <div className="text-xs text-zinc-500 space-y-1">
                {job.companyId.industry && <div>{job.companyId.industry}</div>}
                {job.companyId.size && <div>{job.companyId.size} employees</div>}
                {job.companyId.location && <div>{job.companyId.location}</div>}
              </div>
              <Link
                href={`/companies/${job.companyId.slug}`}
                className="block text-sm text-center underline text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                View company
              </Link>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-50 text-right">{children}</span>
    </div>
  );
}