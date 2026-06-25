import mongoose from "mongoose";

/**
 * Company — employer-owned organization that posts jobs.
 * Verified companies can post without admin review of every job.
 */
const CompanySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    logo: { type: String, default: null }, // Cloudinary URL
    website: { type: String, default: null },
    industry: { type: String, maxlength: 80, default: "" },
    size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
      default: "1-10",
    },
    description: { type: String, maxlength: 2000, default: "" },
    location: { type: String, maxlength: 120, default: "" },
    verified: { type: Boolean, default: false, index: true },
    verificationDocs: { type: [String], default: [] }, // URLs to uploaded docs
  },
  { timestamps: true }
);

CompanySchema.index({ name: "text", description: "text", industry: "text" });

export default mongoose.models.Company ||
  mongoose.model("Company", CompanySchema);