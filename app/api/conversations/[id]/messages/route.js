import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/lib/models/Conversation";
import Message from "@/lib/models/Message";
import User from "@/lib/models/User";
import { withAuth, ok, created, parseJson, badRequest, forbidden, notFound } from "@/lib/api";
import { trigger, channels, events } from "@/lib/pusher";
import { notify } from "@/lib/notifications";

const SendSchema = z.object({
  body: z.string().min(1).max(4000),
});

/**
 * GET /api/conversations/[id]/messages
 * Paginated message history, oldest → newest.
 * Marks the conversation as read by the current user.
 */
export const GET = withAuth(
  async (req, { session, params }) => {
    await connectDB();
    const conv = await Conversation.findById(params.id).lean();
    if (!conv) return notFound("Conversation not found.");
    if (!conv.participants.map(String).includes(session.user.id)) {
      return forbidden("You are not in this conversation.");
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const before = searchParams.get("before"); // ISO date cursor

    const filter = { conversationId: conv._id };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark this user's unread = 0.
    conv.unreadBy?.set?.(String(session.user.id), 0);
    await Conversation.updateOne(
      { _id: conv._id },
      { $set: { [`unreadBy.${session.user.id}`]: 0 } }
    );

    // Return oldest → newest for UI.
    return ok({ items: messages.reverse() });
  }
);

/**
 * POST /api/conversations/[id]/messages
 * Send a message. Persists to Mongo, triggers Pusher, notifies recipient.
 */
export const POST = withAuth(
  async (req, { session, params }) => {
    await connectDB();
    const conv = await Conversation.findById(params.id);
    if (!conv) return notFound("Conversation not found.");
    if (!conv.participants.map(String).includes(session.user.id)) {
      return forbidden("You are not in this conversation.");
    }

    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = SendSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid message.", result.error.issues.map((i) => i.message));
    }
    const { body } = result.data;

    const message = await Message.create({
      conversationId: conv._id,
      senderId: session.user.id,
      body,
      readBy: [session.user.id],
    });

    const preview = body.slice(0, 200);
    conv.lastMessageAt = new Date();
    conv.lastMessagePreview = preview;

    // Increment unread for the other participant.
    const otherId = conv.participants.find((p) => String(p) !== session.user.id);
    if (otherId) {
      const key = `unreadBy.${otherId}`;
      await Conversation.updateOne(
        { _id: conv._id },
        { $inc: { [key]: 1 } }
      );
    }
    await conv.save();

    // Real-time push.
    const channel = channels.conversation(conv._id);
    await trigger(channel, events.MESSAGE_NEW, {
      conversationId: String(conv._id),
      message: message.toObject(),
    });

    // Notify recipient (in-app + best-effort email).
    if (otherId) {
      const recipient = await User.findById(otherId).select("email name").lean();
      const sender = await User.findById(session.user.id).select("name").lean();
      if (recipient) {
        await notify({
          userId: recipient._id,
          type: "new_message",
          title: `New message from ${sender?.name || "a connection"}`,
          body: preview,
          link: `/dashboard/messages?c=${conv._id}`,
          email: recipient.email,
          emailSubject: `New message on TechHire`,
          emailHtml: `<p>Hi ${recipient.name || ""},</p>
            <p><strong>${sender?.name || "Someone"}</strong> sent you a message:</p>
            <blockquote>${preview}</blockquote>
            <p>— TechHire</p>`,
        });
        await trigger(channels.user(recipient._id), events.NOTIFICATION_NEW, {
          type: "new_message",
          conversationId: String(conv._id),
        });
      }
    }

    return created({ message });
  }
);