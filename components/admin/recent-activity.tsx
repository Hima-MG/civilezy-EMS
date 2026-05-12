"use client";

import { Clock, CalendarOff, PhoneCall, IndianRupee } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminActivityItem } from "@/types";

const TYPE_CONFIG = {
  attendance: { icon: Clock, color: "text-blue-500" },
  leave: { icon: CalendarOff, color: "text-yellow-500" },
  lead: { icon: PhoneCall, color: "text-purple-500" },
  salary: { icon: IndianRupee, color: "text-emerald-500" },
} as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActivityFeed({ items }: { items: AdminActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        No recent activity.
      </p>
    );
  }
  return (
    <div>
      {items.map((item) => {
        const { icon: Icon, color } = TYPE_CONFIG[item.type];
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
          >
            <div className={`mt-0.5 shrink-0 ${color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {item.detail}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">
                {timeAgo(item.time)}
              </span>
              {item.status && (
                <Badge
                  variant="outline"
                  className="text-xs h-4 px-1.5 capitalize"
                >
                  {item.status.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RecentActivityProps {
  attendance: AdminActivityItem[];
  leaves: AdminActivityItem[];
  leads: AdminActivityItem[];
  salary: AdminActivityItem[];
}

export function RecentActivity({
  attendance,
  leaves,
  leads,
  salary,
}: RecentActivityProps) {
  return (
    <Card>
      <Tabs defaultValue="attendance">
        <CardHeader className="pb-0">
          <CardTitle className="text-base mb-3">Recent Activity</CardTitle>
          <TabsList className="w-full sm:w-auto h-auto flex-wrap gap-0.5">
            <TabsTrigger value="attendance" className="text-xs gap-1.5">
              <Clock className="w-3 h-3" />
              Attendance
              <span className="ml-0.5 opacity-60">({attendance.length})</span>
            </TabsTrigger>
            <TabsTrigger value="leaves" className="text-xs gap-1.5">
              <CalendarOff className="w-3 h-3" />
              Leaves
              <span className="ml-0.5 opacity-60">({leaves.length})</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs gap-1.5">
              <PhoneCall className="w-3 h-3" />
              Leads
              <span className="ml-0.5 opacity-60">({leads.length})</span>
            </TabsTrigger>
            <TabsTrigger value="salary" className="text-xs gap-1.5">
              <IndianRupee className="w-3 h-3" />
              Salary
              <span className="ml-0.5 opacity-60">({salary.length})</span>
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="p-0">
          <TabsContent value="attendance" className="mt-0">
            <ActivityFeed items={attendance} />
          </TabsContent>
          <TabsContent value="leaves" className="mt-0">
            <ActivityFeed items={leaves} />
          </TabsContent>
          <TabsContent value="leads" className="mt-0">
            <ActivityFeed items={leads} />
          </TabsContent>
          <TabsContent value="salary" className="mt-0">
            <ActivityFeed items={salary} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
