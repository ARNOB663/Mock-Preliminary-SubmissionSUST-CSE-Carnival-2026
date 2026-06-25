import { SKILLS } from "@/lib/skills";
import { ok } from "@/lib/api";

/**
 * GET /api/skills
 * Public. Returns the curated canonical skill list for autocomplete / dropdowns.
 */
export async function GET() {
  return ok({ items: SKILLS });
}