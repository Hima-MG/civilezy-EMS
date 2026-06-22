import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Throws instead of silently returning [] when a Supabase query fails,
 * so the nearest error.tsx boundary catches it instead of rendering an
 * empty dashboard that looks identical to "no data".
 */
export function unwrap<T>(
  result: { data: T | null; error: PostgrestError | null },
  label: string
): T {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message}`);
  }
  return result.data as T;
}

/** Same as unwrap, for head:true count-only queries where data is always null. */
export function unwrapCount(
  result: { count: number | null; error: PostgrestError | null },
  label: string
): number {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message}`);
  }
  return result.count ?? 0;
}
