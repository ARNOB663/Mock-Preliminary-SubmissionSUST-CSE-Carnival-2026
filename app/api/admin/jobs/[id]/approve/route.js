import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import User from "@/lib/models/User";
import { withAuth, ok, notFound } from "@/lib/api";
import { notify } from "@/lib/notifications";

const Schema = z.object({ note: z.string().max(500).optional() }).default({});

/**
 * POST /api/admin/jobs/[id]/approve
 * Admin-only. Approve a pending job → status 'active'.
 */
export const POST = withAuth(
  async (req, { session, params }) => {
    await connectDB();
    const job = await Job.findById(params.id).populate("companyId", "name");
    if (!job) return notFound("Job not found.");

    let body = {};
    try {
      body = await req.json();
    } catch {}
    Schema.parse(body || {});

    job.status = "active";
    job.publishedAt = new Date();
    job.rejectionReason = null;
    await job.save();

    const employer = await User.findById(job.employerId).select("email name").lean();
    if (employer) {
      await notify({
        userId: employer._id,
        type: "verification_update",
        title: `Job approved: ${job.title}`,
        body: `Your job "${job.title}" is now live and accepting applications.`,
        link: `/dashboard/jobs`,
        email: employer.email,
        emailSubject: `Your job is live on TechHire: ${job.title}`,
        emailHtml: `<p>Hi ${employer.name || ""},</p>
          <p>Your job <strong>${job.title}</strong> at ${job.companyId?.name || ""} has been approved and is now live.</p>
          <p>— TechHire</p>`,
      });
    }

    return ok({ job });
  },
  { role: "admin" }
);