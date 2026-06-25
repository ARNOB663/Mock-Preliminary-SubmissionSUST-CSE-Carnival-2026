import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/lib/models/Conversation";
import User from "@/lib/models/User";
import Job from "@/lib/models/Job";
import Application from "@/lib/models/Application";
import { withAuth, ok, created, parseJson, badRequest, forbidden, notFound } from "@/lib/api";

const StartSchema = z.object({
  applicantId: z.string().min(1),
  jobId: z.string().min(1).optional(),
  firstMessage: z.string().min(1).max(4000).optional(),
});

/**
 * POST /api/employer/conversations
 * Employer starts (or fetches) a conversation with an applicant.
 * The caller must own the job the applicant applied to (or be admin).
 */
export const POST = withAuth(
  async (req, { session }) => {
    if (session.user.role !== "employer" && session.user.role !== "admin") {
      return forbidden("Only employers can start applicant conversations.");
    }

    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = StartSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid data.", result.error.issues.map((i) => i.message));
    }
    const { applicantId, jobId, firstMessage } = result.data;

    await connectDB();

    // Authorize: caller must own a job this applicant applied to.
    const appQuery = { applicantId };
    if (jobId) appQuery.jobId = jobId;
    const applications = await Application.find(appQuery)
      .populate("jobId", "employerId title")
      .lean();
    const ownsAtLeastOne = applications.some(
      (a) => a.jobId && String(a.jobId.employerId) === session.user.id
    );
    if (!ownsAtLeastOne && session.user.role !== "admin") {
      return forbidden("This applicant didn't apply to any of your jobs.");
    }

    const applicant = await User.findById(applicantId).select("_id").lean();
    if (!applicant) return notFound("Applicant not found.");

    // Find or create a conversation between employer + applicant.
    let conv = await Conversation.findOne({
      participants: { $all: [session.user.id, applicant._id], $size: 2 },
      ...(jobId ? { jobId } : {}),
    });

    if (!conv) {
      conv = await Conversation.create({
        participants: [session.user.id, applicant._id],
        jobId: jobId || null,
        lastMessageAt: new Date(),
        lastMessagePreview: firstMessage ? firstMessage.slice(0, 200) : "",
        unreadBy: { [String(applicant._id)]: firstMessage ? 1 : 0 },
      });
    }

    if (firstMessage) {
      const Message = (await import("@/lib/models/Message")).default;
      await Message.create({
        conversationId: conv._id,
        senderId: session.user.id,
        body: firstMessage,
        readBy: [session.user.id],
      });
      conv.lastMessageAt = new Date();
      conv.lastMessagePreview = firstMessage.slice(0, 200);
      await conv.save();
    }

    return created({ conversation: conv });
  },
  { role: ["employer", "admin"] }
);