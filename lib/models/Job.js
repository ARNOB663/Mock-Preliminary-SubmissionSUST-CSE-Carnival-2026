import mongoose from "mongoose";

/**
 * Job — stub for warmup submission. Not exercised by the triage service.
 */
const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Job || mongoose.model("Job", JobSchema);