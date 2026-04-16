import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: unknown }) => {
  const isAuthenticated = !!(req as { auth: unknown }).auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isPublicApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (isPublicApi) return NextResponse.next();

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|myfiziologo\\.png|my-logo\\.png|mahmutyucel\\.jpg|myfizioteamimage\\.jpg|apple-touch-icon\\.png|.*\\.svg).*)",
  ],
};
