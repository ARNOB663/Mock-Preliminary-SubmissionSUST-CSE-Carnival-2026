import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Company from "@/lib/models/Company";
import Job from "@/lib/models/Job";
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
    name: z.string().min(2).max(160).optional(),
    website: z.string().url().nullable().optional(),
    industry: z.string().max(80).optional(),
    size: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]).optional(),
    description: z.string().max(2000).optional(),
    location: z.string().max(120).optional(),
    logo: z.string().url().nullable().optional(),
  })
  .strict();

/**
 * GET /api/companies/[slug]
 * Public. Returns company + their active jobs.
 */
export const GET = withAuth(
  async (_req, { params }) => {
    await connectDB();
    const company = await Company.findOne({ slug: params.slug }).lean();
    if (!company) return notFound("Company not found.");

    const jobs = await Job.find({ companyId: company._id, status: "active" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(50)
      .lean();

    return ok({ company, jobs });
  },
  { optional: true }
);

/**
 * PATCH /api/companies/[slug]
 * Owner or admin. Partial update.
 */
export const PATCH = withAuth(
  async (req, { session, params }) => {
    await connectDB();
    const company = await Company.findOne({ slug: params.slug });
    if (!company) return notFound("Company not found.");

    const isOwner = String(company.ownerId) === session.user.id;
    if (!isOwner && session.user.role !== "admin") {
      return forbidden("You can only edit your own company.");
    }

    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = UpdateSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid update.", result.error.issues.map((i) => i.message));
    }

    Object.assign(company, result.data);
    await company.save();
    return ok({ company });
  }
);