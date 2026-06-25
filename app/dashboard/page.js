import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Application from "@/lib/models/Application";
import Job from "@/lib/models/Job";
import Company from "@/lib/models/Company";
import SavedJob from "@/lib/models/SavedJob";
import Profile from "@/lib/models/Profile";

export const metadata = { title: "Dashboard — TechHire" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session.user;
  const role = user?.role || "job_seeker";

  if (role === "employer") return <EmployerOverview userId={user.id} />;
  if (role === "admin") return <AdminTeaser />;
  return <SeekerOverview userId={user.id} />;
}

async function SeekerOverview({ userId }) {
  let profile = null;
  let apps = [];
  let saved = [];
  try {
    await connectDB();
    [profile, apps, saved] = await Promise.all([
      Profile.findOne({ userId }).select("skills headline bio resumeUrl").lean(),
      Application.find({ applicantId: userId })
        .sort({ createdAt: -1 })
        .populate("jobId", "title slug status companyId")
        .limit(5)
        .lean(),
      SavedJob.find({ userId })
        .sort({ savedAt: -1 })
        .populate({ path: "jobId", populate: { path: "companyId", select: "name slug" } })
        .limit(5)
        .lean(),
    ]);
  } catch {}

  const completion = profileCompletion(profile);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || ""}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Track applications, save roles, and keep your profile fresh.
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Profile completion</h2>
          <span className="text-sm font-mono">{completion}%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
        {completion < 100 && (
          <Link
            href="/dashboard/profile"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
          >
            Complete your profile →
          </Link>
        )}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <Panel title="Recent applications" link="/dashboard/applications" linkLabel="All →">
          {apps.length === 0 ? (
            <Empty text="No applications yet. Find a role to apply for." cta={{ href: "/jobs", label: "Browse jobs" }} />
          ) : (
            <ul className="space-y-2">
              {apps.map((a) => (
                <li key={a._id} className="text-sm">
                  <span className="font-medium">{a.jobId?.title}</span>{" "}
                  <span className="text-zinc-500">· {a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Saved jobs" link="/dashboard/saved-jobs" linkLabel="All →">
          {saved.length === 0 || !saved[0]?.jobId ? (
            <Empty text="No saved jobs." cta={{ href: "/jobs", label: "Browse jobs" }} />
          ) : (
            <ul className="space-y-2">
              {saved.map((s) => (
                <li key={s._id} className="text-sm">
                  <Link href={`/jobs/${s.jobId.slug}`} className="font-medium hover:underline">
                    {s.jobId.title}
                  </Link>{" "}
                  <span className="text-zinc-500">· {s.jobId.companyId?.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}

async function EmployerOverview({ userId }) {
  let jobs = [];
  let company = null;
  try {
    await connectDB();
    [jobs, company] = await Promise.all([
      Job.find({ employerId: userId })
        .sort({ createdAt: -1 })
        .populate("companyId", "name verified")
        .limit(5)
        .lean(),
      Company.findOne({ ownerId: userId }).lean(),
    ]);
  } catch {}

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Employer overview</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage your roles and review applicants.
          </p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="px-3 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium"
        >
          Post a role
        </Link>
      </div>

      {!company && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-4 text-sm">
          You don&apos;t have a company yet.{" "}
          <Link href="/dashboard/company" className="underline">Create one</Link>{" "}
          to start posting roles.
        </div>
      )}

      <Panel title="Recent jobs" link="/dashboard/jobs" linkLabel="All →">
        {jobs.length === 0 ? (
          <Empty text="No jobs posted yet." cta={{ href: "/dashboard/jobs/new", label: "Post your first role" }} />
        ) : (
          <ul className="space-y-2">
            {jobs.map((j) => (
              <li key={j._id} className="text-sm flex items-center justify-between gap-2">
                <Link href={`/jobs/${j.slug}`} className="font-medium hover:underline">
                  {j.title}
                </Link>
                <span className="text-xs text-zinc-500">{j.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function AdminTeaser() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Use the admin panel to review jobs, manage users, and verify companies.
      </p>
      <Link
        href="/admin"
        className="inline-block px-3 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium"
      >
        Open admin panel →
      </Link>
    </div>
  );
}

function Panel({ title, link, linkLabel, children }) {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        {link && <Link href={link} className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline">{linkLabel}</Link>}
      </div>
      {children}
    </section>
  );
}

function Empty({ text, cta }) {
  return (
    <div className="text-sm">
      <p className="text-zinc-500">{text}</p>
      {cta && (
        <Link href={cta.href} className="text-sm underline mt-2 inline-block text-zinc-700 dark:text-zinc-300">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function profileCompletion(p) {
  if (!p) return 0;
  const checks = [
    Boolean(p.headline),
    Boolean(p.bio),
    (p.skills?.length || 0) >= 3,
    Boolean(p.resumeUrl),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}