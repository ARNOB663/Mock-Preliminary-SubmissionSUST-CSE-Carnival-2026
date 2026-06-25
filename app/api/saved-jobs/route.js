import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import SavedJob from "@/lib/models/SavedJob";
import Job from "@/lib/models/Job";
import { withAuth, ok, created, parseJson, badRequest, notFound } from "@/lib/api";

const SaveSchema = z.object({ jobId: z.string().min(1) });

/**
 * GET /api/saved-jobs
 * Job seeker's saved jobs (most recent first), joined with the Job doc.
 */
export const GET = withAuth(
  async (_req, { session }) => {
    if (session.user.role !== "job_seeker") {
      return ok({ items: [] });
    }
    await connectDB();
    const items = await SavedJob.find({ userId: session.user.id })
      .sort({ savedAt: -1 })
      .populate({
        path: "jobId",
        populate: { path: "companyId", select: "name slug logo verified" },
      })
      .lean();

    // Drop entries whose job was deleted.
    const cleaned = items.filter((s) => s.jobId);
    return ok({ items: cleaned });
  },
  { role: "job_seeker" }
);

/**
 * POST /api/saved-jobs
 * Toggle save. Returns { saved: boolean }.
 */
export const POST = withAuth(
  async (req, { session }) => {
    if (session.user.role !== "job_seeker") {
      return badRequest("Only job seekers can save jobs.");
    }
    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = SaveSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid data.", result.error.issues.map((i) => i.message));
    }
    const { jobId } = result.data;

    await connectDB();
    const job = await Job.findById(jobId).select("_id").lean();
    if (!job) return notFound("Job not found.");

    const existing = await SavedJob.findOne({
      userId: session.user.id,
      jobId: job._id,
    });

    if (existing) {
      await existing.deleteOne();
      return ok({ saved: false });
    }
    await SavedJob.create({ userId: session.user.id, jobId: job._id });
    return created({ saved: true });
  },
  { role: "job_seeker" }
);