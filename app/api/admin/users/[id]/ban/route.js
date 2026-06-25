import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { withAuth, ok, parseJson, badRequest, notFound } from "@/lib/api";

const Schema = z.object({ banned: z.boolean() });

/**
 * POST /api/admin/users/[id]/ban
 * Admin-only. Toggle ban status on a user.
 */
export const POST = withAuth(
  async (req, { session, params }) => {
    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = Schema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid data.", result.error.issues.map((i) => i.message));
    }

    await connectDB();
    if (params.id === session.user.id) {
      return badRequest("You can't ban yourself.");
    }
    const user = await User.findById(params.id);
    if (!user) return notFound("User not found.");
    user.banned = result.data.banned;
    await user.save();
    return ok({ user });
  },
  { role: "admin" }
);