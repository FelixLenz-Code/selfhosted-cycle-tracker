import { NextResponse, type NextRequest } from "next/server";

// Optimistische Auth-Weiterleitung (nur Cookie-Präsenz, keine DB-Abfrage).
// Die eigentliche Sicherheitsprüfung passiert in der DAL/den Server Actions.
const protectedPrefixes = ["/dashboard", "/calendar", "/partners"];
const authRoutes = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("session")?.value);

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (authRoutes.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
