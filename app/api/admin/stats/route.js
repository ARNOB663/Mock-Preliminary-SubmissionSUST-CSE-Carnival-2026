import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Job from "@/lib/models/Job";
import Company from "@/lib/models/Company";
import Application from "@/lib/models/Application";
import Conversation from "@/lib/models/Conversation";
import { withAuth, ok } from "@/lib/api";

/**
 * GET /api/admin/stats
 * Admin-only. Aggregate counts for the admin dashboard.
 */
export const GET = withAuth(
  async () => {
    await connectDB();
    const [
      usersTotal,
      jobSeekers,
      employers,
      admins,
      bannedUsers,
      jobsTotal,
      activeJobs,
      pendingJobs,
      rejectedJobs,
      companiesTotal,
      verifiedCompanies,
      applicationsTotal,
      pendingApplications,
      conversationsTotal,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "job_seeker" }),
      User.countDocuments({ role: "employer" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ banned: true }),
      Job.countDocuments(),
      Job.countDocuments({ status: "active" }),
      Job.countDocuments({ status: "pending_review" }),
      Job.countDocuments({ status: "rejected" }),
      Company.countDocuments(),
      Company.countDocuments({ verified: true }),
      Application.countDocuments(),
      Application.countDocuments({ status: "pending" }),
      Conversation.countDocuments(),
    ]);

    return ok({
      users: { total: usersTotal, jobSeekers, employers, admins, banned: bannedUsers },
      jobs: { total: jobsTotal, active: activeJobs, pending: pendingJobs, rejected: rejectedJobs },
      companies: { total: companiesTotal, verified: verifiedCompanies },
      applications: { total: applicationsTotal, pending: pendingApplications },
      conversations: conversationsTotal,
    });
  },
  { role: "admin" }
);