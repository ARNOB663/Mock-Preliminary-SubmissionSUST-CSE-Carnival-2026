import mongoose from "mongoose";

/**
 * Notification — in-app feed of events relevant to a user.
 * Pusher pushes new notifications in real time; this collection is the
 * persistent source of truth.
 */
const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "application_status",
        "new_message",
        "new_job_match",
        "job_expiring",
        "system",
        "verification_update",
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, maxlength: 500, default: "" },
    link: { type: String, default: null }, // app-relative path, e.g. "/dashboard/applications"
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Most common query: a user's recent notifications.
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);