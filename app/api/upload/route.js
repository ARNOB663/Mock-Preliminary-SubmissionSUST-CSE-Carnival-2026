import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImage, getUploadLimits } from "@/lib/cloudinary";

/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data POST with a single `file` field containing
 * an image, uploads it to Cloudinary, and returns the hosted URL.
 *
 * The returned `url` can then be sent to Claude (which accepts public image
 * URLs) via the chat endpoint.
 *
 * Limits (env-tunable):
 *   MAX_IMAGE_MB          (default 5)
 *   MAX_IMAGE_DIMENSION   (default 1568 — Claude's sweet spot)
 *   ALLOWED_IMAGE_TYPES   (default jpeg,png,webp,gif)
 *
 * Requires an authenticated session.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { maxBytes, allowedTypes } = getUploadLimits();

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data body." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: 'Missing "file" field in form data.' },
      { status: 400 }
    );
  }

  const type = (file.type || "").toLowerCase();
  if (!allowedTypes.includes(type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type "${type}". Allowed: ${allowedTypes.join(", ")}.`,
      },
      { status: 415 }
    );
  }

  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: `File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max allowed: ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`,
      },
      { status: 413 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await uploadImage(buffer);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[upload] cloudinary failed:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed." },
      { status: 500 }
    );
  }
}