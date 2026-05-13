"use client";

import { Bell, Search, Moon, Sun, Monitor, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSidebar } from "./sidebar-context";

// ── Theme toggle ──────────────────────────────────────────────

function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-sm">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-3.5 w-3.5" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-3.5 w-3.5" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-3.5 w-3.5" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Header ────────────────────────────────────────────────────

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { setMobileOpen } = useSidebar();

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-7 w-7 shrink-0"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Title */}
        <div className="flex flex-col min-w-0">
          <h1 className="font-semibold text-sm leading-tight tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search — desktop only */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-2.5 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="pl-7 h-7 w-48 text-xs bg-muted/50 border-transparent focus-visible:border-border focus-visible:ring-0 rounded-lg placeholder:text-muted-foreground/70"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-7 w-7">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
        </Button>

        <ThemeToggle />
      </div>
    </header>
  );
}
