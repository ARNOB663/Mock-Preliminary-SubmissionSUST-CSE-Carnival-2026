import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import User from "@/lib/models/User";
import { withAuth, ok, parseJson, badRequest, notFound } from "@/lib/api";
import { notify } from "@/lib/notifications";

const Schema = z.object({
  reason: z.string().min(5).max(500),
});

/**
 * POST /api/admin/jobs/[id]/reject
 * Admin-only. Reject a pending job → status 'rejected' with reason.
 */
export const POST = withAuth(
  async (req, { params }) => {
    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = Schema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Reason is required (5-500 chars).", result.error.issues.map((i) => i.message));
    }
    const { reason } = result.data;

    await connectDB();
    const job = await Job.findById(params.id).populate("companyId", "name");
    if (!job) return notFound("Job not found.");

    job.status = "rejected";
    job.rejectionReason = reason;
    await job.save();

    const employer = await User.findById(job.employerId).select("email name").lean();
    if (employer) {
      await notify({
        userId: employer._id,
        type: "verification_update",
        title: `Job needs changes: ${job.title}`,
        body: reason,
        link: `/dashboard/jobs`,
        email: employer.email,
        emailSubject: `Action needed: ${job.title}`,
        emailHtml: `<p>Hi ${employer.name || ""},</p>
          <p>Your job <strong>${job.title}</strong> needs changes before it can go live.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>— TechHire</p>`,
      });
    }

    return ok({ job });
  },
  { role: "admin" }
);