import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Job from "@/lib/models/Job";
import Company from "@/lib/models/Company";
import Application from "@/lib/models/Application";

export const metadata = { title: "Admin — TechHire" };
export const dynamic = "force-dynamic";

async function getStats() {
  await connectDB();
  const [
    usersTotal, jobSeekers, employers,
    jobsTotal, activeJobs, pendingJobs, rejectedJobs,
    companiesTotal, verifiedCompanies,
    applicationsTotal, pendingApplications,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "job_seeker" }),
    User.countDocuments({ role: "employer" }),
    Job.countDocuments(),
    Job.countDocuments({ status: "active" }),
    Job.countDocuments({ status: "pending_review" }),
    Job.countDocuments({ status: "rejected" }),
    Company.countDocuments(),
    Company.countDocuments({ verified: true }),
    Application.countDocuments(),
    Application.countDocuments({ status: "pending" }),
  ]);
  return {
    users: { total: usersTotal, jobSeekers, employers },
    jobs: { total: jobsTotal, active: activeJobs, pending: pendingJobs, rejected: rejectedJobs },
    companies: { total: companiesTotal, verified: verifiedCompanies },
    applications: { total: applicationsTotal, pending: pendingApplications },
  };
}

export default async function AdminHome() {
  const s = await getStats();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin overview</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Live counts from MongoDB.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Jobs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total" value={s.jobs.total} />
          <Stat label="Active" value={s.jobs.active} accent="emerald" />
          <Stat label="Pending review" value={s.jobs.pending} accent={s.jobs.pending ? "amber" : undefined} />
          <Stat label="Rejected" value={s.jobs.rejected} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Total" value={s.users.total} />
          <Stat label="Job seekers" value={s.users.jobSeekers} />
          <Stat label="Employers" value={s.users.employers} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Companies</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Total" value={s.companies.total} />
          <Stat label="Verified" value={s.companies.verified} accent="emerald" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Applications</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Total" value={s.applications.total} />
          <Stat label="Pending" value={s.applications.pending} />
        </div>
      </section>

      {s.jobs.pending > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-4 text-sm">
          <strong>{s.jobs.pending}</strong> job{s.jobs.pending === 1 ? "" : "s"} awaiting review.{" "}
          <a href="/admin/jobs" className="underline">Review queue →</a>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-200 dark:border-emerald-900"
      : accent === "amber"
      ? "border-amber-200 dark:border-amber-900"
      : "border-zinc-200 dark:border-zinc-800";
  return (
    <div className={`rounded-md border ${accentClass} bg-white dark:bg-zinc-950 p-4`}>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}