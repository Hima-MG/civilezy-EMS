export type Role = "employee" | "cre" | "hr_finance" | "admin";

// ── Employee Module ──────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "half_day" | "late";

export interface AttendanceRecord {
  id: string;
  user_id: string;
  attendance_date: string;
  punch_in: string | null;
  punch_out: string | null;
  total_hours: number | null;
  status: AttendanceStatus;
  created_at: string;
}

export type LeaveType = "casual" | "sick" | "earned" | "maternity" | "paternity" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveStatus;
  created_at: string;
}

export type TaskStatus = "pending" | "in_progress" | "completed";

export interface DailyTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

export interface SidebarConfig {
  role: Role;
  items: NavItem[];
}
