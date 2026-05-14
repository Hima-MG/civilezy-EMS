"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types";

interface UseUserReturn {
  profile: UserProfile | null;
  loading: boolean;
}

export function useUser(): UseUserReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Stable client ref — createBrowserClient is cheap but we only need one
  // instance per hook lifecycle.
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;

    async function fetchProfile() {
      // getUser() validates the JWT with the Supabase server — more secure
      // than getSession() which only reads from local storage.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setProfile(data as UserProfile | null);
        setLoading(false);
      }
    }

    // Initial fetch on mount.
    fetchProfile();

    // Subscribe to auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED).
    // We explicitly skip INITIAL_SESSION because the explicit fetchProfile()
    // above already handles the initial load — allowing INITIAL_SESSION would
    // cause a duplicate network call on every mount.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      // Do NOT reset `cancelled` here — the cleanup function sets it to true on
      // unmount, and resetting it in an async event handler would allow setState
      // calls on an unmounted component if the component unmounts just before the
      // subscription fires.
      fetchProfile();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []); // empty deps — effect runs once per mount

  return { profile, loading };
}
