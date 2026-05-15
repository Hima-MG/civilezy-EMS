"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getRoleDashboardPath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/types";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !user) {
      toast.error(signInError?.message ?? "Authentication failed.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      toast.error(`Profile lookup failed: ${profileError.message}`);
      setLoading(false);
      return;
    }

    if (!profile) {
      await supabase.auth.signOut();
      toast.error("Account not found. Contact your administrator.");
      setLoading(false);
      return;
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut();
      toast.error("Your account is inactive. Contact your administrator.");
      setLoading(false);
      return;
    }

    const validRoles: Role[] = ["admin", "hr_finance", "cre", "employee"];
    if (!validRoles.includes(profile.role as Role)) {
      await supabase.auth.signOut();
      toast.error(`Unrecognised account role (${profile.role}). Contact your administrator.`);
      setLoading(false);
      return;
    }

    router.push(getRoleDashboardPath(profile.role as Role));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            className="pl-9"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-9 pr-9"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <a
          href="#"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Forgot password?
        </a>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
