"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PaginationMeta {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function StudentsSearch({ search, pagination }: { search: string; pagination: PaginationMeta }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(search);

  const navigate = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "") params.delete(key);
      else params.set(key, val);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [router, pathname, searchParams]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: value || null, page: null });
  }

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <form onSubmit={onSubmit} className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search name or email… (press Enter)"
          className="pl-8.5 h-9 bg-muted/40 border-border/60 text-sm rounded-xl focus-visible:ring-0 focus-visible:border-border"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </form>

      <div className="flex items-center gap-2">
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        <p className="text-xs text-muted-foreground">{pagination.total} students</p>
        {pagination.totalPages > 1 && (
          <>
            <button
              aria-label="Previous page"
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={pagination.page === 1 || isPending}
              onClick={() => navigate({ page: pagination.page - 1 > 1 ? String(pagination.page - 1) : null })}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground px-1">{pagination.page} / {pagination.totalPages}</span>
            <button
              aria-label="Next page"
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={pagination.page === pagination.totalPages || isPending}
              onClick={() => navigate({ page: String(pagination.page + 1) })}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
