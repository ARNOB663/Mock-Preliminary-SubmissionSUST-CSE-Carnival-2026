import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import Company from "@/lib/models/Company";
import Application from "@/lib/models/Application";
import { cleanSkills } from "@/lib/skills";
import DOMPurify from "isomorphic-dompurify";
import {
  withAuth,
  ok,
  parseJson,
  badRequest,
  forbidden,
  notFound,
} from "@/lib/api";

const UpdateSchema = z
  .object({
    title: z.string().min(3).max(160).optional(),
    description: z.string().min(20).max(20000).optional(),
    requirements: z.array(z.string().max(500)).max(50).optional(),
    responsibilities: z.array(z.string().max(500)).max(50).optional(),
    skills: z.array(z.string()).max(30).optional(),
    jobType: z.enum(["full_time", "part_time", "contract", "internship", "remote"]).optional(),
    experienceLevel: z.enum(["entry", "mid", "senior", "lead"]).optional(),
    salary: z
      .object({
        min: z.number().int().nonnegative().nullable().optional(),
        max: z.number().int().nonnegative().nullable().optional(),
        currency: z.string().max(8).optional(),
        negotiable: z.boolean().optional(),
      })
      .optional(),
    location: z.string().max(120).optional(),
    isRemote: z.boolean().optional(),
    applicationDeadline: z.string().datetime().nullable().optional(),
    status: z
      .enum(["draft", "pending_review", "active", "paused", "closed", "rejected"])
      .optional(),
  })
  .strict();

/**
 * GET /api/jobs/[slug]
 * Public. Returns job detail + company info + application status for current user.
 * Increments views (best-effort).
 */
export const GET = withAuth(
  async (req, { session, params }) => {
    await connectDB();
    const job = await Job.findOne({ slug: params.slug })
      .populate("companyId", "name slug logo verified website location industry size")
      .populate("employerId", "name avatar")
      .lean();
    if (!job) return notFound("Job not found.");

    // Only public-active jobs are visible to non-owners; owners and admins can see all.
    const isOwner =
      session?.user &&
      (String(job.employerId?._id || job.employerId) === session.user.id ||
        session.user.role === "admin");
    if (job.status !== "active" && !isOwner) {
      return notFound("Job not found.");
    }

    // Increment views (don't await to keep response fast).
    Job.updateOne({ _id: job._id }, { $inc: { views: 1 } }).catch(() => {});

    let myApplication = null;
    if (session?.user && session.user.role === "job_seeker") {
      myApplication = await Application.findOne({
        jobId: job._id,
        applicantId: session.user.id,
      })
        .select("status createdAt")
        .lean();
    }

    return ok({ job, myApplication });
  },
  { optional: true }
);

/**
 * PATCH /api/jobs/[slug]
 * Owner or admin. Partial update.
 */
export const PATCH = withAuth(
  async (req, { session, params }) => {
    await connectDB();
    const job = await Job.findOne({ slug: params.slug });
    if (!job) return notFound("Job not found.");

    const isOwner = String(job.employerId) === session.user.id;
    if (!isOwner && session.user.role !== "admin") {
      return forbidden("You can only edit your own jobs.");
    }

    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = UpdateSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid update.", result.error.issues.map((i) => i.message));
    }
    const updates = result.data;

    if (updates.description) {
      updates.description = DOMPurify.sanitize(updates.description, {
        ALLOWED_TAGS: ["b", "i", "u", "strong", "em", "ul", "ol", "li", "p", "br", "a", "code", "pre"],
        ALLOWED_ATTR: ["href", "rel", "target"],
      });
    }
    if (updates.skills) updates.skills = cleanSkills(updates.skills);
    if (updates.applicationDeadline !== undefined) {
      updates.applicationDeadline = updates.applicationDeadline
        ? new Date(updates.applicationDeadline)
        : null;
    }
    if (updates.status === "active" && job.status !== "active") {
      updates.publishedAt = new Date();
    }

    Object.assign(job, updates);
    await job.save();
    return ok({ job });
  }
);

/**
 * DELETE /api/jobs/[slug]
 * Owner or admin. Hard delete.
 */
export const DELETE = withAuth(
  async (_req, { session, params }) => {
    await connectDB();
    const job = await Job.findOne({ slug: params.slug });
    if (!job) return notFound("Job not found.");

    const isOwner = String(job.employerId) === session.user.id;
    if (!isOwner && session.user.role !== "admin") {
      return forbidden("You can only delete your own jobs.");
    }

    // Detach applications (don't cascade-delete; keep history).
    await Application.deleteMany({ jobId: job._id });
    await job.deleteOne();
    return ok({ deleted: true });
  }
);