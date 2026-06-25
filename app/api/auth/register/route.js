import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Profile from "@/lib/models/Profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(120),
  role: z.enum(["job_seeker", "employer"]).default("job_seeker"),
});

/**
 * POST /api/auth/register
 *
 * Email + password registration. Creates a User and, for job_seekers, a
 * starter Profile. Returns the new user (without password).
 */
export async function POST(req) {
  let json;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { name, email, password, role } = parsed.data;
  const emailLower = email.toLowerCase();

  try {
    await connectDB();

    const existing = await User.findOne({ email: emailLower }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: emailLower,
      password: hashed,
      role,
      emailVerified: new Date(), // skip email verification for hackathon speed
    });

    if (role === "job_seeker") {
      // Create an empty profile they can fill in later.
      await Profile.create({ userId: user._id });
    }

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    console.error("[register] failed:", err);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}