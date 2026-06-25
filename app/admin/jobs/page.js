import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import AdminJobRow from "@/components/admin-job-row";

export const metadata = { title: "Admin jobs — TechHire" };
export const dynamic = "force-dynamic";

export default async function AdminJobsPage({ searchParams }) {
  await connectDB();
  const status = searchParams?.status || "pending_review";

  const items = await Job.find({ status })
    .sort({ createdAt: -1 })
    .populate("companyId", "name slug logo verified")
    .populate("employerId", "name email")
    .limit(100)
    .lean();

  const counts = await Job.aggregate([
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id, c.n]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Moderation queue</p>
      </div>

      <nav className="flex items-center gap-1 text-sm border-b border-zinc-200 dark:border-zinc-800 -mx-2 px-2">
        {["pending_review", "active", "paused", "closed", "rejected"].map((s) => (
          <a
            key={s}
            href={`/admin/jobs?status=${s}`}
            className={`px-3 py-2 -mb-px border-b-2 transition-colors ${
              status === s
                ? "border-zinc-900 dark:border-zinc-50 font-medium"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {s.replace("_", " ")} <span className="text-xs text-zinc-400">({countMap[s] || 0})</span>
          </a>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500">
          No jobs with status <strong>{status}</strong>.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((job) => (
            <AdminJobRow key={job._id} job={JSON.parse(JSON.stringify(job))} />
          ))}
        </ul>
      )}
    </div>
  );
}