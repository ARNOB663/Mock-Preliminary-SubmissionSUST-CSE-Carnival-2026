import { connectDB } from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import { withAuth, ok, forbidden, notFound } from "@/lib/api";

/**
 * PATCH /api/notifications/[id]/read
 * Marks a single notification as read (caller must own it).
 */
export const PATCH = withAuth(
  async (_req, { session, params }) => {
    await connectDB();
    const notif = await Notification.findById(params.id);
    if (!notif) return notFound("Notification not found.");
    if (String(notif.userId) !== session.user.id) {
      return forbidden("Not your notification.");
    }
    notif.read = true;
    notif.readAt = new Date();
    await notif.save();
    return ok({ notification: notif });
  }
);