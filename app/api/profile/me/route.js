import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Profile from "@/lib/models/Profile";
import { cleanSkills } from "@/lib/skills";
import { withAuth, ok, parseJson, badRequest, forbidden } from "@/lib/api";

const ProfileUpdateSchema = z
  .object({
    bio: z.string().max(1000).optional(),
    headline: z.string().max(120).optional(),
    location: z.string().max(120).optional(),
    phone: z.string().max(30).optional(),
    skills: z.array(z.string()).max(50).optional(),
    experience: z
      .array(
        z.object({
          title: z.string().max(120),
          company: z.string().max(120),
          start: z.string(), // ISO date
          end: z.string().nullable().optional(),
          description: z.string().max(1000).optional(),
        })
      )
      .max(20)
      .optional(),
    education: z
      .array(
        z.object({
          degree: z.string().max(120),
          institution: z.string().max(160),
          year: z.number().int().min(1950).max(2100),
          gpa: z.number().min(0).max(4).optional(),
        })
      )
      .max(10)
      .optional(),
    portfolioUrl: z.string().url().nullable().optional(),
    githubUrl: z.string().url().nullable().optional(),
    linkedinUrl: z.string().url().nullable().optional(),
    expectedSalary: z.number().int().nonnegative().nullable().optional(),
    preferredJobType: z
      .enum(["full_time", "part_time", "contract", "internship", "remote", "any"])
      .optional(),
    name: z.string().min(1).max(120).optional(), // also update User.name
  })
  .strict();

/**
 * GET /api/profile/me
 * Job seeker's own profile (auto-created on first read).
 */
export const GET = withAuth(
  async (_req, { session }) => {
    if (session.user.role !== "job_seeker") {
      return forbidden("Only job seekers have profiles here.");
    }
    await connectDB();
    let profile = await Profile.findOne({ userId: session.user.id }).lean();
    if (!profile) {
      const created = await Profile.create({ userId: session.user.id });
      profile = created.toObject();
    }
    const user = await User.findById(session.user.id)
      .select("name email avatar role")
      .lean();
    return ok({ profile, user });
  },
  { role: "job_seeker" }
);

/**
 * PATCH /api/profile/me
 * Update profile fields. Creates profile if missing.
 */
export const PATCH = withAuth(
  async (req, { session }) => {
    if (session.user.role !== "job_seeker") {
      return forbidden("Only job seekers can edit a profile.");
    }
    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = ProfileUpdateSchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid profile data.", result.error.issues.map((i) => i.message));
    }
    const updates = result.data;

    await connectDB();

    // Name lives on User.
    if (updates.name) {
      await User.updateOne({ _id: session.user.id }, { name: updates.name });
      delete updates.name;
    }
    if (updates.skills) updates.skills = cleanSkills(updates.skills);
    if (updates.experience) {
      updates.experience = updates.experience.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: e.end ? new Date(e.end) : null,
      }));
    }

    const profile = await Profile.findOneAndUpdate(
      { userId: session.user.id },
      { $set: updates, $setOnInsert: { userId: session.user.id } },
      { new: true, upsert: true, runValidators: true }
    );

    return ok({ profile });
  },
  { role: "job_seeker" }
);