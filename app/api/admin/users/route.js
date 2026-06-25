import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { withAuth, ok } from "@/lib/api";

/**
 * GET /api/admin/users
 * Admin-only. List users with filters.
 *   ?role=   job_seeker | employer | admin
 *   ?q=      text search on name/email
 *   ?banned= true
 *   ?page=   default 1
 *   ?limit=  default 50, max 100
 */
export const GET = withAuth(
  async (req) => {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const q = (searchParams.get("q") || "").trim();
    const banned = searchParams.get("banned");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (role && ["job_seeker", "employer", "admin"].includes(role)) filter.role = role;
    if (banned === "true") filter.banned = true;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .select("name email role avatar banned createdAt lastActive")
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return ok({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
  },
  { role: "admin" }
);