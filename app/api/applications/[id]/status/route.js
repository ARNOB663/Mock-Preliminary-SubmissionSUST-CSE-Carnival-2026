import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Application from "@/lib/models/Application";
import Job from "@/lib/models/Job";
import User from "@/lib/models/User";
import { withAuth, ok, parseJson, badRequest, forbidden, notFound } from "@/lib/api";
import { notify } from "@/lib/notifications";

const StatusSchema = z.object({
  status: z.enum([
    "pending",
    "reviewing",
    "shortlisted",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
  ]),
});

/**
 * PATCH /api/applications/[id]/status
 *   - Employer (owner of the job) or admin: set to any status.
 *   - Job seeker (applicant): may only withdraw their own.
 */
export const PATCH = withAuth(
  async (req, { session, params }) => {
    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = StatusSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid status.", result.error.issues.map((i) => i.message));
    }
    const { status: newStatus } = result.data;

    await connectDB();
    const application = await Application.findById(params.id);
    if (!application) return notFound("Application not found.");

    const job = await Job.findById(application.jobId).lean();
    if (!job) return notFound("Job not found.");

    const isEmployerOwner =
      session.user.role === "employer" && String(job.employerId) === session.user.id;
    const isAdmin = session.user.role === "admin";
    const isApplicant =
      session.user.role === "job_seeker" && String(application.applicantId) === session.user.id;

    if (isApplicant) {
      if (newStatus !== "withdrawn") {
        return forbidden("Applicants can only withdraw their application.");
      }
    } else if (!isEmployerOwner && !isAdmin) {
      return forbidden("You can't change this application.");
    }

    application.status = newStatus;
    application.statusHistory.push({
      status: newStatus,
      changedBy: session.user.id,
      changedAt: new Date(),
    });
    await application.save();

    // Notify applicant on non-trivial status changes.
    if (!isApplicant) {
      const applicant = await User.findById(application.applicantId)
        .select("email name")
        .lean();
      if (applicant) {
        await notify({
          userId: applicant._id,
          type: "application_status",
          title: `Application updated: ${newStatus}`,
          body: `Your application for ${job.title} is now "${newStatus}".`,
          link: `/dashboard/applications`,
          email: applicant.email,
          emailSubject: `Update on your application: ${job.title}`,
          emailHtml: `<p>Hi ${applicant.name || ""},</p>
            <p>Your application for <strong>${job.title}</strong> is now <strong>${newStatus}</strong>.</p>
            <p>— TechHire</p>`,
        });
      }
    }

    return ok({ application });
  }
);