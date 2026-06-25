import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Company from "@/lib/models/Company";
import Job from "@/lib/models/Job";
import { toSlug, uniqueSlug } from "@/lib/slugify";
import { withAuth, ok, created, parseJson, badRequest, forbidden } from "@/lib/api";

const CompanyInputSchema = z.object({
  name: z.string().min(2).max(160),
  website: z.string().url().nullable().optional(),
  industry: z.string().max(80).default(""),
  size: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]).default("1-10"),
  description: z.string().max(2000).default(""),
  location: z.string().max(120).default(""),
  logo: z.string().url().nullable().optional(),
});

/**
 * GET /api/companies
 * Public. List companies (verified first, then recent).
 *   ?q= text search on name/industry/description
 *   ?verified=true filter to verified only
 */
export const GET = withAuth(
  async (req) => {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const verifiedParam = searchParams.get("verified");
    const filter = {};
    if (q) filter.$text = { $search: q };
    if (verifiedParam === "true") filter.verified = true;

    const items = await Company.find(filter)
      .sort({ verified: -1, createdAt: -1 })
      .limit(100)
      .lean();
    return ok({ items });
  },
  { optional: true }
);

/**
 * POST /api/companies
 * Employer-only. Create a new company owned by the caller.
 */
export const POST = withAuth(
  async (req, { session }) => {
    if (session.user.role !== "employer" && session.user.role !== "admin") {
      return forbidden("Only employers can create companies.");
    }

    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = CompanyInputSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid company data.", result.error.issues.map((i) => i.message));
    }
    const input = result.data;

    await connectDB();
    const baseSlug = toSlug(input.name);
    const slug = await uniqueSlug(Company, baseSlug);

    const company = await Company.create({
      ownerId: session.user.id,
      name: input.name,
      slug,
      website: input.website || null,
      industry: input.industry,
      size: input.size,
      description: input.description,
      location: input.location,
      logo: input.logo || null,
      verified: false,
    });
    return created({ company });
  },
  { role: ["employer", "admin"] }
);