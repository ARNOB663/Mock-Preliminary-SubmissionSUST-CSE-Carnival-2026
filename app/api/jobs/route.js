import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import Company from "@/lib/models/Company";
import User from "@/lib/models/User";
import { cleanSkills } from "@/lib/skills";
import { toSlug, uniqueSlug } from "@/lib/slugify";
import DOMPurify from "isomorphic-dompurify";
import {
  withAuth,
  ok,
  created,
  parseJson,
  badRequest,
  forbidden,
  notFound,
} from "@/lib/api";

const JobInputSchema = z.object({
  title: z.string().min(3).max(160),
  companyId: z.string().min(1),
  description: z.string().min(20).max(20000),
  requirements: z.array(z.string().max(500)).max(50).default([]),
  responsibilities: z.array(z.string().max(500)).max(50).default([]),
  skills: z.array(z.string()).max(30).default([]),
  jobType: z.enum(["full_time", "part_time", "contract", "internship", "remote"]),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead"]).default("entry"),
  salary: z
    .object({
      min: z.number().int().nonnegative().nullable().optional(),
      max: z.number().int().nonnegative().nullable().optional(),
      currency: z.string().max(8).default("BDT"),
      negotiable: z.boolean().default(false),
    })
    .default({}),
  location: z.string().max(120).default(""),
  isRemote: z.boolean().default(false),
  applicationDeadline: z.string().datetime().nullable().optional(),
  submitForReview: z.boolean().default(true),
});

/**
 * GET /api/jobs
 * Public. List active jobs with filters:
 *   ?q=        text search (title/description/skills/location)
 *   ?location= location substring
 *   ?jobType=  full_time | part_time | contract | internship | remote
 *   ?skills=   comma-separated skill filter (any-of)
 *   ?page=     default 1
 *   ?limit=    default 20, max 50
 */
export const GET = withAuth(
  async (req) => {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const location = (searchParams.get("location") || "").trim();
    const jobType = (searchParams.get("jobType") || "").trim();
    const skillsParam = (searchParams.get("skills") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20)
    );
    const skip = (page - 1) * limit;

    const filter = { status: "active" };

    if (q) {
      filter.$text = { $search: q };
    }
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }
    if (jobType && ["full_time", "part_time", "contract", "internship", "remote"].includes(jobType)) {
      filter.jobType = jobType;
    }
    if (skillsParam) {
      const wanted = skillsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (wanted.length) filter.skills = { $in: wanted };
    }

    const [items, total] = await Promise.all([
      Job.find(filter)
        .sort(q ? { score: { $meta: "textScore" } } : { publishedAt: -1, createdAt: -1 })
        .populate("companyId", "name slug logo verified")
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    return ok({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
  { optional: true }
);

/**
 * POST /api/jobs
 * Employer-only. Creates a new job.
 *   - Requires the user to own the company (or be admin).
 *   - Company must be verified; otherwise job starts in pending_review.
 *   - Title is slugified uniquely.
 */
export const POST = withAuth(
  async (req, { session }) => {
    if (session.user.role !== "employer" && session.user.role !== "admin") {
      return forbidden("Only employers can post jobs.");
    }

    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = JobInputSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid job data.", result.error.issues.map((i) => i.message));
    }
    const input = result.data;

    await connectDB();

    // Verify company exists and caller owns it (or caller is admin).
    const company = await Company.findById(input.companyId).lean();
    if (!company) return notFound("Company not found.");
    const ownerId = String(company.ownerId);
    if (session.user.role !== "admin" && ownerId !== session.user.id) {
      return forbidden("You don't own this company.");
    }

    // Sanitize the rich-text-ish description.
    const safeDescription = DOMPurify.sanitize(input.description, {
      ALLOWED_TAGS: ["b", "i", "u", "strong", "em", "ul", "ol", "li", "p", "br", "a", "code", "pre"],
      ALLOWED_ATTR: ["href", "rel", "target"],
    });

    const skills = cleanSkills(input.skills);
    const baseSlug = toSlug(input.title);
    const slug = await uniqueSlug(Job, baseSlug);

    const initialStatus = company.verified ? "pending_review" : "pending_review";
    // Every new job starts pending_review; admins can flip to active.

    const job = await Job.create({
      employerId: session.user.id,
      companyId: company._id,
      title: input.title,
      slug,
      description: safeDescription,
      requirements: input.requirements,
      responsibilities: input.responsibilities,
      skills,
      jobType: input.jobType,
      experienceLevel: input.experienceLevel,
      salary: input.salary,
      location: input.location,
      isRemote: input.isRemote,
      applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
      status: initialStatus,
    });

    // If admin is creating, optionally activate immediately.
    if (session.user.role === "admin" && input.submitForReview === false) {
      job.status = "active";
      job.publishedAt = new Date();
      await job.save();
    }

    return created({ job });
  },
  { role: ["employer", "admin"] }
);