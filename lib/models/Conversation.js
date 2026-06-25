import mongoose from "mongoose";

/**
 * Conversation — a thread between exactly two users (seeker + employer).
 * We keep lastMessageAt / lastMessagePreview denormalized for the inbox view.
 */
const ConversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: [(v) => v.length === 2, "Conversation must have exactly 2 participants."],
      index: true,
    },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, maxlength: 200, default: "" },
    // Optional context: link to a job this conversation started from.
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    // Per-user unread counts so we can render badges without scanning messages.
    unreadBy: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
  },
  { timestamps: true }
);

// Compound index for the most common query: list a user's conversations, newest first.
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);