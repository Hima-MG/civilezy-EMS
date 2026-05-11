"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, User, Clock, CalendarOff, FileText,
  CheckSquare, Users, Building2, MapPin, Phone, BarChart2,
  DollarSign, UserPlus, TrendingUp, UserCheck, Target,
  Briefcase, LineChart, Settings, Shield, LogOut, Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_CONFIG } from "@/lib/nav-config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/actions/auth";
import { getInitials, getRoleLabel } from "@/lib/utils";
import type { UserProfile, Role } from "@/types";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, User, Clock, CalendarOff, FileText, CheckSquare,
  Users, Building2, MapPin, Phone, BarChart2, DollarSign, UserPlus,
  TrendingUp, UserCheck, Target, Briefcase, LineChart, Settings, Shield,
};

interface SidebarProps {
  profile: UserProfile | null;
  role: Role;
}

export function Sidebar({ profile, role }: SidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_CONFIG[role] ?? [];

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r bg-sidebar text-sidebar-foreground shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary shrink-0">
          <Building className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm leading-tight truncate">CivilEzy EMS</span>
          <span className="text-xs text-muted-foreground truncate">
            {getRoleLabel(role)}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isActive =
              pathname === item.href ||
              (item.href !== `/${role}` && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive
                      ? "text-sidebar-accent-foreground"
                      : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                  )}
                />
                <span className="truncate">{item.title}</span>
                {item.badge ? (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-xs px-1.5 py-0 h-5"
                  >
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="px-3 pb-4 space-y-2 shrink-0">
        <Separator />
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(profile?.full_name ?? profile?.email ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">
              {profile?.full_name ?? "User"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </span>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
