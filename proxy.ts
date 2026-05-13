import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  try {
    return (await updateSession(request)).supabaseResponse;
  } catch {
    // If session refresh fails (e.g. cold start, missing env, network error)
    // let the request through — page-level auth guards will handle protection.
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     * - _next/static  (compiled JS/CSS bundles)
     * - _next/image   (image optimisation endpoint)
     * - favicon.ico   (browser icon)
     * - common static extensions
     *
     * Supabase session cookies must be refreshed on every navigation so that
     * supabase.auth.getUser() in Server Components always sees a valid JWT.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
