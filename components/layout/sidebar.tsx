"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, User, Clock, CalendarOff, FileText,
  CheckSquare, Users, Building2, MapPin, Phone, BarChart2,
  DollarSign, UserPlus, TrendingUp, UserCheck, Target,
  Briefcase, LineChart, Settings, Shield, LogOut,
  ClipboardList, Calendar, CreditCard, ChevronLeft, ChevronRight,
  Zap, X, GraduationCap, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_CONFIG } from "@/lib/nav-config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logoutAction } from "@/actions/auth";
import { getInitials, getRoleLabel } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import type { UserProfile, Role, NavItem } from "@/types";

// ── Icon registry ─────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, User, Clock, CalendarOff, FileText, CheckSquare,
  Users, Building2, MapPin, Phone, BarChart2, DollarSign, UserPlus,
  TrendingUp, UserCheck, Target, Briefcase, LineChart, Settings, Shield,
  ClipboardList, Calendar, CreditCard, GraduationCap, RefreshCw,
};

// ── Role badge styles ─────────────────────────────────────────

const ROLE_COLORS: Record<Role, string> = {
  employee:   "bg-blue-500/15 text-blue-400",
  cre:        "bg-violet-500/15 text-violet-400",
  hr_finance: "bg-emerald-500/15 text-emerald-400",
  admin:      "bg-orange-500/15 text-orange-400",
};

// ── Active state helper ───────────────────────────────────────

function isNavItemActive(
  itemHref: string,
  pathname: string,
  roleRoot: string,
  currentTab: string | null
): boolean {
  if (itemHref.includes("?")) {
    const [path, query] = itemHref.split("?");
    const tab = new URLSearchParams(query).get("tab");
    return pathname === path && currentTab === tab;
  }
  if (itemHref === roleRoot) {
    return pathname === roleRoot && !currentTab;
  }
  return pathname.startsWith(itemHref) && itemHref !== roleRoot;
}

// ── Nav item component ────────────────────────────────────────

function NavItem({
  item,
  isActive,
  collapsed,
  onNavClick,
  layoutScope,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavClick?: () => void;
  layoutScope: string;
}) {
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;

  const linkContent = (
    <Link
      href={item.href}
      onClick={onNavClick}
      className={cn(
        "relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 group",
        collapsed ? "h-9 w-9 justify-center mx-auto" : "gap-2.5 px-3 py-2",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId={`active-pill-${layoutScope}`}
          className="absolute inset-0 rounded-lg bg-sidebar-accent"
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        />
      )}
      <Icon
        className={cn(
          "relative w-4 h-4 shrink-0 transition-colors",
          isActive
            ? "text-sidebar-accent-foreground"
            : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed && (
        <span className="relative truncate">{item.title}</span>
      )}
      {!collapsed && item.badge ? (
        <Badge
          variant="secondary"
          className="relative ml-auto text-xs px-1.5 py-0 h-4 shrink-0"
        >
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="text-xs">
          {item.title}
          {item.badge ? ` (${item.badge})` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

// ── SidebarNav (needs useSearchParams → Suspense boundary) ────

function SidebarNav({
  navItems,
  role,
  collapsed,
  onNavClick,
  layoutScope,
}: {
  navItems: NavItem[];
  role: Role;
  collapsed: boolean;
  onNavClick?: () => void;
  layoutScope: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const roleRoot = `/${role === "hr_finance" ? "hr" : role}`;

  return (
    <nav className={cn("space-y-0.5", collapsed && "flex flex-col items-center space-y-0.5")}>
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={isNavItemActive(item.href, pathname, roleRoot, currentTab)}
          collapsed={collapsed}
          onNavClick={onNavClick}
          layoutScope={layoutScope}
        />
      ))}
    </nav>
  );
}

function NavSkeleton({ count, collapsed }: { count: number; collapsed: boolean }) {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center rounded-lg bg-muted/30 animate-pulse",
            collapsed ? "h-9 w-9 mx-auto" : "gap-2.5 px-3 py-2 h-9"
          )}
        >
          {!collapsed && (
            <>
              <div className="w-4 h-4 rounded bg-muted-foreground/20 shrink-0" />
              <div className="h-3 rounded bg-muted-foreground/20 flex-1 max-w-[90px]" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── SidebarContent (shared between desktop + mobile) ─────────

function SidebarContent({
  profile,
  role,
  collapsed,
  onNavClick,
  showCollapseToggle,
  onToggleCollapse,
  layoutScope,
}: {
  profile: UserProfile | null;
  role: Role;
  collapsed: boolean;
  onNavClick?: () => void;
  showCollapseToggle?: boolean;
  onToggleCollapse?: () => void;
  layoutScope: string;
}) {
  const navItems = NAV_CONFIG[role] ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* ── Brand ──────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-sidebar-border shrink-0 px-3",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        <div className={cn("flex items-center gap-2.5 min-w-0", collapsed && "justify-center")}>
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sidebar-primary shrink-0">
            <Zap className="w-3.5 h-3.5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm leading-tight tracking-tight truncate">
                CivilEzy
              </span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight">
                EMS
              </span>
            </div>
          )}
        </div>
        {showCollapseToggle && !collapsed && (
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Role badge ─────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="role-badge"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden px-3 pt-3 pb-1"
          >
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider",
                ROLE_COLORS[role]
              )}
            >
              {getRoleLabel(role)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ─────────────────────────────────────── */}
      <ScrollArea className="flex-1 px-2 py-2">
        <Suspense fallback={<NavSkeleton count={navItems.length} collapsed={collapsed} />}>
          <SidebarNav
            navItems={navItems}
            role={role}
            collapsed={collapsed}
            onNavClick={onNavClick}
            layoutScope={layoutScope}
          />
        </Suspense>
      </ScrollArea>

      {/* ── Expand button (collapsed mode) ─────────────────── */}
      {showCollapseToggle && collapsed && (
        <div className="flex justify-center pb-2 px-2">
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-9 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── User section ───────────────────────────────────── */}
      <div className="shrink-0 border-t border-sidebar-border p-2 space-y-1">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">
                {getInitials(profile?.full_name ?? profile?.email ?? "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium leading-tight truncate">
                {profile?.full_name ?? "User"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight">
                {profile?.email}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-7 h-7 cursor-default">
                  <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">
                    {getInitials(profile?.full_name ?? profile?.email ?? "U")}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="text-xs">
                {profile?.full_name ?? "User"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <form action={logoutAction}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="submit"
                  className="flex items-center justify-center w-9 h-8 mx-auto rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="text-xs">
                Sign out
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              Sign out
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Main exported Sidebar ─────────────────────────────────────

interface SidebarProps {
  profile: UserProfile | null;
  role: Role;
}

export function Sidebar({ profile, role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar sticky top-0 h-screen shrink-0 overflow-hidden z-20"
      >
        <SidebarContent
          profile={profile}
          role={role}
          collapsed={collapsed}
          showCollapseToggle
          onToggleCollapse={() => setCollapsed((c) => !c)}
          layoutScope="desktop"
        />
      </motion.aside>

      {/* ── Mobile overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 h-full w-60 z-50 bg-sidebar border-r border-sidebar-border flex flex-col lg:hidden shadow-2xl"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3.5 right-3 flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors z-10"
                aria-label="Close sidebar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <SidebarContent
                profile={profile}
                role={role}
                collapsed={false}
                onNavClick={() => setMobileOpen(false)}
                layoutScope="mobile"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
