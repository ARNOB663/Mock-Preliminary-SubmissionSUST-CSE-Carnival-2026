import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Company from "@/lib/models/Company";
import Job from "@/lib/models/Job";

export async function generateMetadata({ params }) {
  return { title: `${params.slug} — TechHire` };
}

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }) {
  let company = null;
  let jobs = [];
  try {
    await connectDB();
    company = await Company.findOne({ slug: params.slug }).lean();
    if (company) {
      jobs = await Job.find({ companyId: company._id, status: "active" })
        .sort({ publishedAt: -1, createdAt: -1 })
        .lean();
    }
  } catch {}

  if (!company) notFound();

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">TechHire</Link>
          <Link href="/jobs" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
            Browse jobs →
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12 space-y-10">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">{company.name}</h1>
            {company.verified && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 text-xs uppercase tracking-wide">
                Verified
              </span>
            )}
          </div>
          <div className="text-sm text-zinc-500">
            {company.industry || "—"} · {company.size} employees
            {company.location && ` · ${company.location}`}
            {company.website && (
              <>
                {" · "}
                <a href={company.website} target="_blank" rel="noreferrer" className="hover:underline">
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              </>
            )}
          </div>
          {company.description && (
            <p className="text-zinc-700 dark:text-zinc-300 max-w-2xl leading-relaxed whitespace-pre-line">
              {company.description}
            </p>
          )}
        </header>

        <section>
          <h2 className="text-xl font-semibold tracking-tight mb-4">Open roles</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-zinc-500">No open roles right now.</p>
          ) : (
            <ul className="space-y-3">
              {jobs.map((j) => (
                <li key={j._id}>
                  <Link
                    href={`/jobs/${j.slug}`}
                    className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                  >
                    <div className="font-medium">{j.title}</div>
                    <div className="text-sm text-zinc-500 mt-0.5">
                      {j.location || "Remote"} · {j.jobType.replace("_", " ")}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}