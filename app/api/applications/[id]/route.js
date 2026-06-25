import { connectDB } from "@/lib/mongodb";
import Application from "@/lib/models/Application";
import Job from "@/lib/models/Job";
import Profile from "@/lib/models/Profile";
import User from "@/lib/models/User";
import { withAuth, ok, forbidden, notFound } from "@/lib/api";

/**
 * GET /api/applications/[id]
 *   - Applicant (job seeker) can view their own application.
 *   - Employer (job owner) can view applications to their job.
 *   - Admin can view all.
 */
export const GET = withAuth(
  async (_req, { session, params }) => {
    await connectDB();
    const application = await Application.findById(params.id)
      .populate("jobId")
      .populate("applicantId", "name email avatar")
      .lean();
    if (!application) return notFound("Application not found.");

    const isApplicant = String(application.applicantId?._id || application.applicantId) === session.user.id;
    const job = application.jobId;
    const isEmployerOwner =
      session.user.role === "employer" && String(job.employerId) === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isApplicant && !isEmployerOwner && !isAdmin) {
      return forbidden("You can't view this application.");
    }

    // For employers/admins, also include the applicant's profile.
    let applicantProfile = null;
    if (!isApplicant) {
      const applicantId = application.applicantId?._id || application.applicantId;
      applicantProfile = await Profile.findOne({ userId: applicantId }).lean();
    }

    return ok({ application, applicantProfile });
  }
);