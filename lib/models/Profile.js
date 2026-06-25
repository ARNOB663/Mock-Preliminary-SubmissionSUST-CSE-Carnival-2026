import mongoose from "mongoose";

/**
 * Profile — job_seeker profile data (stub for warmup submission).
 * Not exercised by the QueueStorm triage service.
 */
const ProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    headline: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);