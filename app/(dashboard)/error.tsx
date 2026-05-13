"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred while loading this page. Your data is safe — try refreshing or go back to the dashboard.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl border border-border/60 bg-muted/40 text-foreground text-sm font-medium hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
