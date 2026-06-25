import mongoose from "mongoose";

/**
 * Profile — extended details for job_seeker users. 1:1 with User.
 */
const ExperienceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    start: { type: Date, required: true },
    end: { type: Date, default: null }, // null = current
    description: { type: String, maxlength: 1000 },
  },
  { _id: false }
);

const EducationSchema = new mongoose.Schema(
  {
    degree: { type: String, required: true, trim: true, maxlength: 120 },
    institution: { type: String, required: true, trim: true, maxlength: 160 },
    year: { type: Number, required: true, min: 1950, max: 2100 },
    gpa: { type: Number, min: 0, max: 4 },
  },
  { _id: false }
);

const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    bio: { type: String, maxlength: 1000, default: "" },
    headline: { type: String, maxlength: 120, default: "" },
    location: { type: String, maxlength: 120, default: "" },
    phone: { type: String, maxlength: 30, default: "" },
    skills: { type: [String], default: [], index: true },
    experience: { type: [ExperienceSchema], default: [] },
    education: { type: [EducationSchema], default: [] },
    resumeUrl: { type: String, default: null }, // Cloudinary URL
    resumeFilename: { type: String, default: null },
    portfolioUrl: { type: String, default: null },
    githubUrl: { type: String, default: null },
    linkedinUrl: { type: String, default: null },
    expectedSalary: { type: Number, default: null },
    preferredJobType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship", "remote", "any"],
      default: "any",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Profile ||
  mongoose.model("Profile", ProfileSchema);