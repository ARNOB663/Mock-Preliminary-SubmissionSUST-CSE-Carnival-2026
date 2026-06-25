import mongoose from "mongoose";

/**
 * SavedJob — a job_seeker's bookmark of a Job.
 * Compound unique index ensures one save per (user, job).
 */
const SavedJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

SavedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export default mongoose.models.SavedJob ||
  mongoose.model("SavedJob", SavedJobSchema);