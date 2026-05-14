"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { punchInAction, punchOutAction } from "@/actions/employee/attendance";
import type { AttendanceRecord } from "@/types";

interface PunchButtonsProps {
  todayRecord: AttendanceRecord | null;
}

export function PunchButtons({ todayRecord }: PunchButtonsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState<"in" | "out" | null>(null);

  const hasPunchedIn = !!todayRecord?.punch_in;
  const hasPunchedOut = !!todayRecord?.punch_out;

  async function handlePunchIn() {
    setLoading("in");
    try {
      const result = await punchInAction();
      if (result.success) {
        toast.success("Punched in! Have a productive day.");
        startTransition(() => router.refresh());
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handlePunchOut() {
    setLoading("out");
    try {
      const result = await punchOutAction();
      if (result.success) {
        const hours = result.data.total_hours;
        toast.success(`Punched out. Total: ${hours}h logged.`);
        startTransition(() => router.refresh());
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        onClick={handlePunchIn}
        disabled={loading !== null || hasPunchedIn}
        size="sm"
        className="gap-1.5"
      >
        {loading === "in" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogIn className="w-3.5 h-3.5" />
        )}
        Punch In
      </Button>

      <Button
        onClick={handlePunchOut}
        disabled={loading !== null || !hasPunchedIn || hasPunchedOut}
        size="sm"
        variant="outline"
        className="gap-1.5"
      >
        {loading === "out" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        Punch Out
      </Button>
    </div>
  );
}
