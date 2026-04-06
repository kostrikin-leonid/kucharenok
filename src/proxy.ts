import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/recipes",
  "/plan",
  "/shopping",
  "/family",
  "/settings",
  "/join",
];

const AUTH_ROUTES = ["/login", "/register"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (isProtectedPath(pathname) && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_ROUTES.includes(pathname) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/recipes/:path*",
    "/plan/:path*",
    "/shopping/:path*",
    "/family/:path*",
    "/settings/:path*",
    "/join/:path*",
    "/login",
    "/register",
  ],
};
