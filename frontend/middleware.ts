import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth/login", "/auth/signup"];

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard"];

  // Note: Since we're using localStorage for tokens, middleware can't access it.
  // Client-side authentication checks are handled in the components themselves.
  // This middleware is primarily for static route protection patterns.

  // Allow all routes to pass through - actual auth protection happens client-side
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
