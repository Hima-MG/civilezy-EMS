import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile, Role } from "@/types";

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>>["data"]["user"] | null;
  profile: UserProfile | null;
  role: Role | null;
}

// cache() deduplicates calls within the same request/render cycle — if multiple
// Server Components call getAuthContext(), only one Supabase round-trip is made.
export const getAuthContext = cache(async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, profile: null, role: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = (profile ?? null) as UserProfile | null;
  return {
    supabase,
    user,
    profile: typedProfile,
    role: (typedProfile?.role ?? null) as Role | null,
  };
});
