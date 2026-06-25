import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import { withAuth, ok } from "@/lib/api";

/**
 * GET /api/admin/jobs
 * Admin-only. List jobs across all statuses.
 *   ?status=  pending_review (default) | active | rejected | paused | closed
 *   ?page=    default 1
 *   ?limit=   default 50
 */
export const GET = withAuth(
  async (req) => {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending_review";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Job.find({ status })
        .sort({ createdAt: -1 })
        .populate("companyId", "name slug logo verified")
        .populate("employerId", "name email")
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments({ status }),
    ]);

    return ok({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
  },
  { role: "admin" }
);