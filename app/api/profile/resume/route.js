import { connectDB } from "@/lib/mongodb";
import Profile from "@/lib/models/Profile";
import { withAuth, ok, forbidden, serverError } from "@/lib/api";

/**
 * POST /api/profile/resume
 * Body: { url, filename }
 * Saves the Cloudinary URL onto the current job_seeker's profile.
 * The actual file upload is performed by the existing /api/upload endpoint;
 * this route just persists the resulting URL.
 */
export const POST = withAuth(
  async (req, { session }) => {
    if (session.user.role !== "job_seeker") {
      return forbidden("Only job seekers can attach a resume.");
    }
    try {
      const body = await req.json();
      const { url, filename } = body || {};
      if (!url || !filename) {
        return ok({ error: "Missing url or filename." }, { status: 400 });
      }
      await connectDB();
      const profile = await Profile.findOneAndUpdate(
        { userId: session.user.id },
        {
          $set: { resumeUrl: url, resumeFilename: filename },
          $setOnInsert: { userId: session.user.id },
        },
        { new: true, upsert: true }
      );
      return ok({ resumeUrl: profile.resumeUrl, resumeFilename: profile.resumeFilename });
    } catch (err) {
      return serverError("Failed to save resume.", err?.message);
    }
  },
  { role: "job_seeker" }
);