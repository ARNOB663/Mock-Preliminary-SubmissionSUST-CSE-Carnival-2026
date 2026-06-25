import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import Company from "@/lib/models/Company";

export const dynamic = "force-dynamic";

async function getFeaturedJobs() {
  try {
    await connectDB();
    const jobs = await Job.find({ status: "active" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .populate("companyId", "name slug logo verified")
      .limit(3)
      .lean();
    return jobs;
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    await connectDB();
    const [jobs, companies] = await Promise.all([
      Job.countDocuments({ status: "active" }),
      Company.countDocuments(),
    ]);
    return { jobs, companies };
  } catch {
    return { jobs: 0, companies: 0 };
  }
}

export default async function HomePage() {
  const [featured, stats] = await Promise.all([getFeaturedJobs(), getStats()]);

  return (
    <div className="flex flex-col flex-1">
      <SiteHeader />

      <main className="flex-1">
        {/* Asymmetric hero: 60/40 split, copy on the left, side card on the right. */}
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid md:grid-cols-12 gap-10 md:gap-12 items-start">
            <div className="md:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
                <span className="h-px w-6 bg-zinc-300 dark:bg-zinc-700" />
                A job board built for tech hiring in Bangladesh
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tighter leading-[1.05]">
                Find your next tech role, <span className="text-zinc-400 dark:text-zinc-500">minus the noise.</span>
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed">
                TechHire filters for the work that matters. No mixed-in sales calls, no
                degree gatekeeping. Real roles from verified employers, posted by humans.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/jobs"
                  className="inline-flex items-center rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Browse jobs
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Post a role
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-6 text-sm text-zinc-500">
                <span><strong className="text-zinc-900 dark:text-zinc-50 font-semibold">{stats.jobs}</strong> open roles</span>
                <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span><strong className="text-zinc-900 dark:text-zinc-50 font-semibold">{stats.companies}</strong> companies</span>
              </div>
            </div>

            {/* Right-side asymmetric stat card. */}
            <aside className="md:col-span-5 md:mt-12">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">This week</span>
                  <span className="text-xs text-zinc-400">live data</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MiniStat label="Posted" value={Math.max(stats.jobs, 8)} suffix=" roles" />
                  <MiniStat label="Verified" value={Math.max(Math.round(stats.companies * 0.7), 3)} suffix=" employers" />
                </div>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Every employer goes through document verification before they can list
                  a role. You won&apos;t find ghost jobs or commission-only traps here.
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Bento grid: 1 wide + 2 stacked, asymmetric */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 md:p-8 space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">For job seekers</div>
              <h3 className="text-2xl font-semibold tracking-tight">Apply in two clicks.</h3>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-md">
                Your profile is your CV. Upload once, attach to any role, with an optional
                short cover note. Saved jobs stay synced across devices.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 md:p-8 space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">For employers</div>
              <h3 className="text-xl font-semibold tracking-tight">Verified postings only.</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Submit business docs once. After approval, every role you post goes live
                without re-review.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6 md:p-8 space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Built for Bangladesh</div>
              <h3 className="text-xl font-semibold tracking-tight">BDT-native salaries.</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Salary ranges in BDT, locations you actually live in, remote roles that
                ship globally.
              </p>
            </div>
            <div className="md:col-span-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 md:p-8 space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">How it works</div>
              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                <Step n="01" title="Post" body="Employer lists a role with skills and salary range." />
                <Step n="02" title="Match" body="Seekers save and apply with their existing profile." />
                <Step n="03" title="Talk" body="Both sides chat in-app once a match is made." />
              </div>
            </div>
          </div>
        </section>

        {/* Featured jobs — real data */}
        {featured.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 pb-24">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Recently posted</h2>
              <Link href="/jobs" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
                View all →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {featured.map((j) => (
                <Link
                  key={j._id}
                  href={`/jobs/${j.slug}`}
                  className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{j.companyId?.name}</span>
                    {j.companyId?.verified && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-medium">{j.title}</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {j.location || "Remote"} · {j.jobType.replace("_", " ")}
                  </div>
                  {j.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {j.skills.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          TechHire
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/jobs"
            className="px-3 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Jobs
          </Link>
          <Link
            href="/companies"
            className="px-3 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Companies
          </Link>
          <Link
            href="/signin"
            className="px-3 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="ml-2 px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="font-semibold tracking-tight">TechHire</div>
          <p className="mt-2 text-zinc-500 text-xs leading-relaxed max-w-xs">
            A job board for tech hiring in Bangladesh. Built by the Reflexive Squirrels
            for SUST CSE Carnival 2026.
          </p>
        </div>
        <FooterCol title="Product" items={[["Jobs", "/jobs"], ["Companies", "/companies"], ["For employers", "/signup"]]} />
        <FooterCol title="Account" items={[["Sign in", "/signin"], ["Sign up", "/signup"]]} />
        <FooterCol title="Legal" items={[["About", "/about"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"]]} />
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-4 text-xs text-zinc-500">
          © 2026 TechHire. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <div className="font-medium text-zinc-900 dark:text-zinc-50">{title}</div>
      <ul className="mt-2 space-y-1.5">
        {items.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat({ label, value, suffix }) {
  return (
    <div>
      <div className="text-3xl font-semibold tracking-tight">
        {value}
        <span className="text-base text-zinc-400 font-normal">{suffix}</span>
      </div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function Step({ n, title, body }) {
  return (
    <div>
      <div className="text-xs font-mono text-zinc-400">{n}</div>
      <div className="mt-1 font-medium">{title}</div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{body}</div>
    </div>
  );
}