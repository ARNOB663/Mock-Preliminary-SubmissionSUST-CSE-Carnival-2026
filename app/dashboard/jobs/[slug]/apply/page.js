import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import ApplyForm from "@/components/apply-form";

export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/dashboard/jobs/${params.slug}/apply`);
  }
  if (session.user.role !== "job_seeker") {
    redirect(`/dashboard?error=not_seeker`);
  }

  let job = null;
  try {
    await connectDB();
    job = await Job.findOne({ slug: params.slug, status: "active" })
      .populate("companyId", "name slug")
      .lean();
  } catch {}

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-2xl font-semibold">Job not found</h1>
        <p className="text-zinc-500 mt-2">This role may have been closed.</p>
        <Link href="/jobs" className="text-sm underline mt-4 inline-block">
          Browse other jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div>
        <Link href={`/jobs/${job.slug}`} className="text-sm text-zinc-500 hover:underline">
          ← Back to job
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Apply: {job.title}</h1>
        <p className="text-sm text-zinc-500 mt-1">{job.companyId?.name}</p>
      </div>
      <ApplyForm jobId={String(job._id)} jobTitle={job.title} />
    </div>
  );
}