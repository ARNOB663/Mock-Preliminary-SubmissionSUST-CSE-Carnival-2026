import { connectDB } from "@/lib/mongodb";
import Job from "@/lib/models/Job";
import Company from "@/lib/models/Company";
import { ok } from "@/lib/api";
import { suggestSkills } from "@/lib/skills";

/**
 * GET /api/search/suggestions
 * Public. Returns lightweight typeahead results.
 *   ?q=        required (non-empty after trim)
 *   ?limit=    default 5, max 10
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(10, Math.max(1, parseInt(searchParams.get("limit") || "5", 10) || 5));

  if (!q) return ok({ jobs: [], companies: [], skills: [] });

  await connectDB();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [jobs, companies, skills] = await Promise.all([
    Job.find({ status: "active", title: regex })
      .select("title slug")
      .limit(limit)
      .lean(),
    Company.find({ name: regex })
      .select("name slug logo")
      .limit(limit)
      .lean(),
    Promise.resolve(suggestSkills(q, limit)),
  ]);

  return ok({ jobs, companies, skills });
}