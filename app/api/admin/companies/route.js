import { connectDB } from "@/lib/mongodb";
import Company from "@/lib/models/Company";
import { withAuth, ok } from "@/lib/api";

/**
 * GET /api/admin/companies
 * Admin-only. List companies (verified first, then pending verification).
 *   ?verified=true|false (omit for all)
 */
export const GET = withAuth(
  async (req) => {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const v = searchParams.get("verified");
    const filter = {};
    if (v === "true") filter.verified = true;
    if (v === "false") filter.verified = false;

    const items = await Company.find(filter)
      .sort({ verified: -1, createdAt: -1 })
      .populate("ownerId", "name email")
      .limit(200)
      .lean();

    return ok({ items });
  },
  { role: "admin" }
);