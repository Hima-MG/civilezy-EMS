import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getRoleDashboardPath } from "@/lib/utils";
import type { Role } from "@/types";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

const ROLE_PATHS: Record<string, Role[]> = {
  "/employee": ["employee", "admin"],
  "/cre": ["cre", "admin"],
  "/hr": ["hr_finance", "admin"],
  "/admin": ["admin"],
};

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated → redirect to login (except public paths)
  if (!user) {
    if (isPublic) return supabaseResponse;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting /login → redirect to their dashboard
  if (pathname === "/login") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role ?? "employee") as Role;
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = getRoleDashboardPath(role);
    return NextResponse.redirect(dashboardUrl);
  }

  // Root → redirect to dashboard
  if (pathname === "/") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role ?? "employee") as Role;
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = getRoleDashboardPath(role);
    return NextResponse.redirect(dashboardUrl);
  }

  // RBAC enforcement
  const matchedBase = Object.keys(ROLE_PATHS).find((base) =>
    pathname.startsWith(base)
  );

  if (matchedBase) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = (profile?.role ?? "employee") as Role;
    const allowedRoles = ROLE_PATHS[matchedBase];

    if (!allowedRoles.includes(userRole)) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = getRoleDashboardPath(userRole);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
