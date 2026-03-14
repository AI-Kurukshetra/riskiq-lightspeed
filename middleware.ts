import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = await updateSession(request);

  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/applications") ||
    request.nextUrl.pathname.startsWith("/quotes") ||
    request.nextUrl.pathname.startsWith("/reports") ||
    request.nextUrl.pathname.startsWith("/rules") ||
    request.nextUrl.pathname.startsWith("/audit") ||
    request.nextUrl.pathname.startsWith("/underwriting");

  if (!isDashboardRoute) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/applications/:path*",
    "/quotes/:path*",
    "/reports/:path*",
    "/rules/:path*",
    "/audit/:path*",
    "/underwriting/:path*",
  ],
};
