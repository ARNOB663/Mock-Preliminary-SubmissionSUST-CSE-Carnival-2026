import mongoose from "mongoose";

/**
 * User — base account record. Extended by Profile (for job_seekers) and
 * Company (owned by employers).
 *
 * Roles:
 *   - job_seeker  — looks for work, applies to jobs
 *   - employer    — posts jobs, reviews applications
 *   - admin       — moderates content
 */
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, select: false }, // hashed via bcryptjs, never returned by default
    role: {
      type: String,
      enum: ["job_seeker", "employer", "admin"],
      default: "job_seeker",
      required: true,
    },
    googleId: { type: String, sparse: true, unique: true },
    emailVerified: { type: Date, default: null },
    avatar: { type: String, default: null }, // Cloudinary URL
    banned: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1, googleId: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);