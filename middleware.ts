import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRoleDashboardPath } from "@/lib/utils";
import type { Role } from "@/types";

// Centralized role matrix — single source of truth for who can reach which
// dashboard section. Admin sees everything; everyone else is confined to
// their own area(s). HR Finance additionally needs the Employee section
// since HR staff also punch attendance / file leave as employees.
const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  admin: ["/admin", "/hr", "/cre", "/employee"],
  hr_finance: ["/hr", "/employee"],
  cre: ["/cre"],
  employee: ["/employee"],
};

const PROTECTED_PREFIXES = ["/admin", "/hr", "/cre", "/employee"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies back to both the request and response so the
          // refreshed session is visible to Server Components in the same cycle.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is the critical call.
  // It writes updated auth cookies to the response headers, which means the
  // browser client never needs to do it, eliminating the cookie-change reload loop.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Single-column lookup — role gate only needs role + is_active, not the
  // full profile (that's fetched separately, deduped via cache(), in layouts).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = profile.role as Role;
  const allowedPrefixes = ROLE_ALLOWED_PREFIXES[role] ?? [];
  const isAllowed = allowedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isAllowed) {
    const dashboardUrl = new URL(getRoleDashboardPath(role), request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and image optimization routes.
    // Run on all other paths including API routes and pages.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
