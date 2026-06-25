import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";

export const metadata = { title: "Jobs — TechHire" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function JobsPage({ searchParams }) {
  const sp = searchParams || {};
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const q = (sp.q || "").trim();
  const location = (sp.location || "").trim();
  const jobType = (sp.jobType || "").trim();
  const skills = (sp.skills || "").trim();
  const skip = (page - 1) * PAGE_SIZE;

  const filter = { status: "active" };
  if (q) filter.$text = { $search: q };
  if (location) filter.location = { $regex: location, $options: "i" };
  if (jobType && ["full_time", "part_time", "contract", "internship", "remote"].includes(jobType)) {
    filter.jobType = jobType;
  }
  if (skills) {
    filter.skills = { $in: skills.split(",").map((s) => s.trim()).filter(Boolean) };
  }

  let items = [];
  let total = 0;
  try {
    await connectDB();
    [items, total] = await Promise.all([
      Job.find(filter)
        .sort(q ? { score: { $meta: "textScore" } } : { publishedAt: -1, createdAt: -1 })
        .populate("companyId", "name slug logo verified")
        .skip(skip)
        .limit(PAGE_SIZE)
        .lean(),
      Job.countDocuments(filter),
    ]);
  } catch {
    // DB unavailable — show empty state, not a crash.
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">TechHire</Link>
          <Link
            href="/signup"
            className="px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-10 grid md:grid-cols-12 gap-8">
        {/* Sidebar filters */}
        <aside className="md:col-span-3 space-y-5">
          <form className="space-y-4 text-sm">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1">Search</label>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="React, Backend, etc."
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1">Location</label>
              <input
                type="text"
                name="location"
                defaultValue={location}
                placeholder="Dhaka, Remote"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1">Type</label>
              <select
                name="jobType"
                defaultValue={jobType}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
              >
                <option value="">Any</option>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1">Skills (comma separated)</label>
              <input
                type="text"
                name="skills"
                defaultValue={skills}
                placeholder="React, Node.js"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
              />
            </div>
            <button className="w-full rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-3 py-2 text-sm font-medium">
              Apply filters
            </button>
          </form>
        </aside>

        {/* Results */}
        <section className="md:col-span-9 space-y-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">
              {total} {total === 1 ? "job" : "jobs"}
              {q ? <span className="text-zinc-500 font-normal"> for &quot;{q}&quot;</span> : null}
            </h1>
            {(q || location || jobType || skills) && (
              <Link href="/jobs" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 underline">
                Clear filters
              </Link>
            )}
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center text-zinc-500">
              No jobs match your filters yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((j) => (
                <li key={j._id}>
                  <Link
                    href={`/jobs/${j.slug}`}
                    className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>{j.companyId?.name}</span>
                          {j.companyId?.verified && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-medium">{j.title}</div>
                        <div className="mt-1 text-sm text-zinc-500">
                          {j.location || "Remote"} · {j.jobType.replace("_", " ")}
                          {j.experienceLevel && ` · ${j.experienceLevel} level`}
                        </div>
                        {j.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {j.skills.slice(0, 5).map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {j.salary?.min && (
                          <div className="text-sm font-medium">
                            {j.salary.currency || "BDT"} {j.salary.min.toLocaleString()}
                            {j.salary.max ? ` – ${j.salary.max.toLocaleString()}` : ""}
                          </div>
                        )}
                        <div className="text-xs text-zinc-400 mt-1">
                          {j.publishedAt ? new Date(j.publishedAt).toLocaleDateString() : "New"}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm">
              <span className="text-zinc-500">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={{ query: { ...sp, page: page - 1 } }}
                    className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={{ query: { ...sp, page: page + 1 } }}
                    className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}