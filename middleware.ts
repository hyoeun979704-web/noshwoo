import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Auth.js v5 middleware — partner routes require an authenticated session.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPartnerRoute = pathname.startsWith("/dashboard");
  if (isPartnerRoute && !req.auth) {
    const loginUrl = new URL("/onboarding", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  // Skip Next internals and the demo toggle route (which has its own guard).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/demo|api/auth).*)"],
};
