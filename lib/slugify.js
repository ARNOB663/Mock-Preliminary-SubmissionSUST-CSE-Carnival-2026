import slugify from "slugify";

/**
 * Generate a URL-safe slug from arbitrary text. Falls back to a random hex
 * suffix when the text would otherwise produce an empty slug.
 */
export function toSlug(text) {
  const base = slugify(String(text || ""), {
    lower: true,
    strict: true,
    trim: true,
    locale: "en",
  });
  if (base) return base.slice(0, 80);
  // Random fallback (e.g. title is only non-ASCII characters).
  return "item-" + Math.random().toString(36).slice(2, 8);
}

/**
 * Make a slug unique against a Mongoose model by appending -2, -3, ... if needed.
 *
 * @param {import('mongoose').Model} model  — Mongoose model with a `slug: { unique: true }` field.
 * @param {string} base                    — Slug candidate (from toSlug).
 * @param {{ excludeId?: string }} [opts]  — When updating, exclude the doc being updated.
 * @returns {Promise<string>}              — A unique slug.
 */
export async function uniqueSlug(model, base, opts = {}) {
  let candidate = base;
  let n = 1;
  // Cap at 30 attempts to avoid runaway loops; collision is extremely unlikely.
  while (n < 30) {
    const query = { slug: candidate };
    if (opts.excludeId) query._id = { $ne: opts.excludeId };
    const exists = await model.exists(query);
    if (!exists) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  // Fallback: append random hex.
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}