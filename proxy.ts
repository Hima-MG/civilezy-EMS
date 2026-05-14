import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const DASHBOARD_PREFIXES = ["/admin", "/hr", "/cre", "/employee"];
const AUTH_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guard: missing env → pass through, page-level auth guards still protect routes
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Mirror refreshed tokens onto the request first so downstream
        // Server Components see the updated JWT.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() validates the JWT with Supabase servers and triggers a token
  // refresh when the access token is near expiry. DO NOT remove this call —
  // without it Server Components will see stale/expired sessions and
  // incorrectly redirect authenticated users to /login.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated users trying to access a dashboard → send to login
  const isDashboardRoute = DASHBOARD_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  if (!user && isDashboardRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users hitting auth pages → redirect to their dashboard.
  // Only applies to GET requests (page loads). POST requests are Server
  // Actions — redirecting them causes "unexpected response" on the client
  // because React can't handle a 3xx as a server action response.
  if (request.method === "GET" && user && AUTH_PATHS.includes(pathname)) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/employee";
    return NextResponse.redirect(dashUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
