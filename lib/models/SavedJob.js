import mongoose from "mongoose";

/**
 * SavedJob — stub for warmup submission. Not exercised by the triage service.
 */
const SavedJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  },
  { timestamps: true }
);

SavedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export default mongoose.models.SavedJob || mongoose.model("SavedJob", SavedJobSchema);