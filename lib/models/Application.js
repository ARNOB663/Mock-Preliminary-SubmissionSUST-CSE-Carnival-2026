import mongoose from "mongoose";

/**
 * Application — a job_seeker's submission to a Job.
 * One application per (jobId, applicantId) pair (enforced by unique index).
 */
const ApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "reviewing", "shortlisted", "interview", "offer", "rejected", "withdrawn"],
      default: "pending",
      required: true,
      index: true,
    },
    coverLetter: { type: String, maxlength: 4000, default: "" },
    // Snapshot of the applicant's resume URL at the time of application,
    // so deleting the profile doesn't break the employer's view.
    resumeSnapshotUrl: { type: String, default: null },
    resumeSnapshotFilename: { type: String, default: null },
    expectedSalary: { type: Number, default: null },
    availableFrom: { type: Date, default: null },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

// One application per applicant per job.
ApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

// Common query: applications to a job, newest first.
ApplicationSchema.index({ jobId: 1, createdAt: -1 });

export default mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);