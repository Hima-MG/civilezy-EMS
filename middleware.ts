import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return (await updateSession(request)).supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, images, and favicon.
     * Session cookies must be refreshed on every navigation so getUser()
     * in Server Components always sees a valid, unexpired JWT.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
