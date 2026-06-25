import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Edge-level auth gate.
 *   - /dashboard/*  → must be signed in.
 *   - /admin/*      → must be signed in AND role === 'admin'.
 *
 * Server-side layouts also re-check; this is the fast first gate.
 */
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    // Admin gate: /admin/* requires role === 'admin'.
    if (pathname.startsWith("/admin") && role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "forbidden");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/signin" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};