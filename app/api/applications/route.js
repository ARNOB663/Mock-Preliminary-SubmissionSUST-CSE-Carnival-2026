import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Application from "@/lib/models/Application";
import Job from "@/lib/models/Job";
import Company from "@/lib/models/Company";
import User from "@/lib/models/User";
import Profile from "@/lib/models/Profile";
import { withAuth, ok, created, parseJson, badRequest, forbidden, notFound, conflict } from "@/lib/api";
import { notify } from "@/lib/notifications";

const ApplySchema = z.object({
  jobId: z.string().min(1),
  coverLetter: z.string().max(4000).default(""),
  expectedSalary: z.number().int().nonnegative().nullable().optional(),
  availableFrom: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/applications
 *   - job_seeker: list my applications
 *   - employer:   list applications to my jobs (filter by jobId, status)
 *   - admin:      list all (filter by jobId, status)
 */
export const GET = withAuth(
  async (req, { session }) => {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");
    const filter = {};
    if (jobId) filter.jobId = jobId;
    if (status) filter.status = status;

    if (session.user.role === "job_seeker") {
      filter.applicantId = session.user.id;
    } else if (session.user.role === "employer") {
      // Only applications to jobs owned by this employer.
      const myJobs = await Job.find({ employerId: session.user.id })
        .select("_id")
        .lean();
      const jobIds = myJobs.map((j) => j._id);
      filter.jobId = filter.jobId ? { $in: jobIds.filter((id) => String(id) === jobId) } : { $in: jobIds };
      if (!jobIds.length) return ok({ items: [] });
    }

    const items = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate("jobId", "title slug status companyId")
      .populate("applicantId", "name email avatar")
      .limit(200)
      .lean();

    return ok({ items });
  }
);

/**
 * POST /api/applications
 * Job_seeker applies to a job. Enforces:
 *   - job is active
 *   - job's applicationDeadline has not passed
 *   - applicant hasn't already applied to this job
 */
export const POST = withAuth(
  async (req, { session }) => {
    if (session.user.role !== "job_seeker") {
      return forbidden("Only job seekers can apply to jobs.");
    }
    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = ApplySchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid application data.", result.error.issues.map((i) => i.message));
    }
    const { jobId, coverLetter, expectedSalary, availableFrom } = result.data;

    await connectDB();
    const job = await Job.findById(jobId).lean();
    if (!job) return notFound("Job not found.");
    if (job.status !== "active") {
      return badRequest("This job is not currently accepting applications.");
    }
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      return badRequest("The application deadline has passed.");
    }

    const existing = await Application.findOne({
      jobId: job._id,
      applicantId: session.user.id,
    }).lean();
    if (existing) return conflict("You've already applied to this job.");

    // Snapshot the resume so it remains visible after profile changes.
    const profile = await Profile.findOne({ userId: session.user.id })
      .select("resumeUrl resumeFilename")
      .lean();

    const application = await Application.create({
      jobId: job._id,
      applicantId: session.user.id,
      coverLetter,
      expectedSalary: expectedSalary ?? null,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      resumeSnapshotUrl: profile?.resumeUrl || null,
      resumeSnapshotFilename: profile?.resumeFilename || null,
      statusHistory: [{ status: "pending", changedBy: session.user.id }],
    });

    await Job.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });

    // Notify employer.
    const employer = await User.findById(job.employerId).select("email name").lean();
    const company = await Company.findById(job.companyId).select("name slug").lean();
    if (employer) {
      const seeker = await User.findById(session.user.id).select("name").lean();
      await notify({
        userId: employer._id,
        type: "application_status",
        title: `New applicant for ${job.title}`,
        body: `${seeker?.name || "A candidate"} applied to ${job.title} at ${company?.name || "your company"}.`,
        link: `/dashboard/jobs/${job._id}/applications`,
        email: employer.email,
        emailSubject: `New applicant: ${job.title}`,
        emailHtml: `<p>Hi ${employer.name || ""},</p>
          <p><strong>${seeker?.name || "A candidate"}</strong> just applied to <strong>${job.title}</strong>.</p>
          <p>Review the application in your dashboard.</p>
          <p>— TechHire</p>`,
      });
    }

    return created({ application });
  },
  { role: "job_seeker" }
);