import mongoose from "mongoose";

/**
 * Job — a posted role. Lifecycle:
 *   draft → pending_review → active → (paused | closed) → rejected
 *
 * Admin moderation: every new job starts at pending_review unless the
 * employer is verified AND has posted successfully before.
 */
const SalarySchema = new mongoose.Schema(
  {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    currency: { type: String, default: "BDT", maxlength: 8 },
    negotiable: { type: Boolean, default: false },
  },
  { _id: false }
);

const JobSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true, maxlength: 20000 }, // sanitized markdown
    requirements: { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    skills: { type: [String], default: [], index: true },
    jobType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship", "remote"],
      required: true,
      index: true,
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead"],
      default: "entry",
      index: true,
    },
    salary: { type: SalarySchema, default: () => ({}) },
    location: { type: String, maxlength: 120, default: "", index: true },
    isRemote: { type: Boolean, default: false },
    applicationDeadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "pending_review", "active", "paused", "closed", "rejected"],
      default: "pending_review",
      required: true,
      index: true,
    },
    rejectionReason: { type: String, maxlength: 500, default: null },
    views: { type: Number, default: 0 },
    applicationsCount: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Text index for search.
JobSchema.index({
  title: "text",
  description: "text",
  skills: "text",
  location: "text",
});

// Compound index for the most common listing query: active + recent.
JobSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Job || mongoose.model("Job", JobSchema);