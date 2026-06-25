import { connectDB } from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import { withAuth, ok } from "@/lib/api";

/**
 * GET /api/notifications
 * Current user's notifications, newest first.
 *   ?unread=true → only unread
 *   ?limit=50    → default 50, max 200
 */
export const GET = withAuth(
  async (req, { session }) => {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    );

    const filter = { userId: session.user.id };
    if (unreadOnly) filter.read = false;

    const items = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: session.user.id,
      read: false,
    });

    return ok({ items, unreadCount });
  }
);

/**
 * POST /api/notifications/read-all
 * Marks every notification for the current user as read.
 */
export const POST = withAuth(
  async (_req, { session }) => {
    await connectDB();
    await Notification.updateMany(
      { userId: session.user.id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return ok({ ok: true });
  }
);