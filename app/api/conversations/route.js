import { connectDB } from "@/lib/mongodb";
import Conversation from "@/lib/models/Conversation";
import User from "@/lib/models/User";
import Job from "@/lib/models/Job";
import { withAuth, ok, notFound } from "@/lib/api";

/**
 * GET /api/conversations
 * Current user's conversation list, newest activity first.
 * Includes the other participant's name/avatar and the unread count.
 */
export const GET = withAuth(
  async (_req, { session }) => {
    await connectDB();
    const userId = session.user.id;
    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .lean();

    if (!conversations.length) return ok({ items: [] });

    // Collect other-participant ids and the optional jobIds.
    const otherIds = conversations.map((c) =>
      c.participants.find((p) => String(p) !== userId)
    );
    const jobIds = conversations.map((c) => c.jobId).filter(Boolean);

    const [others, jobs] = await Promise.all([
      User.find({ _id: { $in: otherIds } })
        .select("name email avatar role")
        .lean(),
      jobsHelper(jobIds),
    ]);
    const otherMap = new Map(others.map((u) => [String(u._id), u]));
    const jobMap = new Map(jobs.map((j) => [String(j._id), j]));

    const items = conversations.map((c) => {
      const otherId = c.participants.find((p) => String(p) !== userId);
      const other = otherMap.get(String(otherId));
      return {
        ...c,
        other: other
          ? { _id: other._id, name: other.name, avatar: other.avatar, role: other.role }
          : null,
        job: c.jobId ? jobMap.get(String(c.jobId)) || null : null,
        unread: c.unreadBy?.get?.(String(userId)) || 0,
      };
    });

    return ok({ items });
  }
);

async function jobsHelper(ids) {
  if (!ids.length) return [];
  return Job.find({ _id: { $in: ids } })
    .select("title slug companyId")
    .populate("companyId", "name slug")
    .lean();
}