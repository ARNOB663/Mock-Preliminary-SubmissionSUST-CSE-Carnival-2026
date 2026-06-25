import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Higher-order wrapper for API route handlers that adds:
 *   - JSON response normalization
 *   - Centralized error handling
 *   - Optional session check (with role enforcement)
 *
 * Usage:
 *   export const GET = withAuth(async (req, { session }) => {
 *     return ok({ items: [...] });
 *   });
 *
 *   export const POST = withAuth(handler, { role: 'employer' });
 */

export function ok(data, init = {}) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created(data) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message, details = null) {
  return NextResponse.json(
    { error: message, details },
    { status: 400 }
  );
}

export function unauthorized(message = "Unauthorized.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message = "Server error.", details = null) {
  console.error("[api]", message, details);
  return NextResponse.json({ error: message, details }, { status: 500 });
}

/**
 * Wrap an API handler with auth + error handling.
 *
 * @param {(req: Request, ctx: { session: Session, params?: any }) => Promise<Response>} handler
 * @param {{ role?: 'job_seeker'|'employer'|'admin'|Array<string>, optional?: boolean }} [opts]
 *   - role: required role(s). User must match one.
 *   - optional: if true, don't 401 on missing session (handler decides).
 */
export function withAuth(handler, opts = {}) {
  return async function wrapped(req, ctx = {}) {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (err) {
      console.error("[withAuth] getServerSession threw:", err);
    }

    if (!session?.user) {
      if (opts.optional) {
        return handler(req, { session: null, ...ctx });
      }
      return unauthorized();
    }

    if (opts.role) {
      const allowed = Array.isArray(opts.role) ? opts.role : [opts.role];
      if (!allowed.includes(session.user.role)) {
        return forbidden(`Requires role: ${allowed.join(" or ")}.`);
      }
    }

    try {
      return await handler(req, { session, ...ctx });
    } catch (err) {
      // Mongoose validation errors → 400
      if (err?.name === "ValidationError") {
        return badRequest(err.message, Object.values(err.errors || {}).map((e) => e.message));
      }
      // Duplicate-key errors → 409
      if (err?.code === 11000) {
        return conflict("Duplicate value for a field that must be unique.");
      }
      return serverError("Handler failed.", err?.message || String(err));
    }
  };
}

/**
 * Parse a JSON body. Returns { ok: true, data } or { ok: false, response }.
 */
export async function parseJson(req) {
  try {
    const data = await req.json();
    return { ok: true, data };
  } catch {
    return { ok: false, response: badRequest("Invalid JSON body.") };
  }
}