export type Role = "employee" | "cre" | "hr_finance" | "admin";
export type EmployeeCategory = "content_creator" | "tech_lead" | "digital_marketer";

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
  employee_category: EmployeeCategory | null;
  avatar_url: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

// ── CRE CRM Module ───────────────────────────────────────────

export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "follow_up"
  | "converted"
  | "lost";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  course_interest: string | null;
  source: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

// ── HR + Finance Module ──────────────────────────────────────

export type SalaryStatus = "pending" | "paid";

export interface SalaryRecord {
  id: string;
  user_id: string;
  month: string;          // "YYYY-MM" format
  working_days: number;
  present_days: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  final_salary: number;
  status: SalaryStatus;
  created_at: string;
}

export interface AttendanceWithProfile extends AttendanceRecord {
  full_name: string;
  email: string;
}

export interface LeaveWithProfile extends LeaveRequest {
  full_name: string;
  email: string;
}

export interface SalaryWithProfile extends SalaryRecord {
  full_name: string;
  email: string;
}

export interface HrAnalytics {
  totalEmployees: number;
  pendingLeaves: number;
  presentToday: number;
  monthlyPayroll: number;
}

export interface MonthlyPayrollPoint {
  month: string;
  total: number;
}

// ── Admin Module ─────────────────────────────────────────────

export interface AdminStats {
  totalEmployees: number;
  totalLeads: number;
  attendanceToday: number;
  pendingLeaves: number;
  monthlyPayroll: number;
  convertedLeads: number;
}

export interface RoleDistributionPoint {
  role: string;
  count: number;
  color: string;
}

export interface AttendanceTrendPoint {
  month: string;
  present: number;
}

export interface LeadStatusPoint {
  status: string;
  count: number;
  color: string;
}

export interface AdminActivityItem {
  id: string;
  type: "attendance" | "leave" | "lead" | "salary";
  name: string;
  detail: string;
  status: string;
  time: string;
}

// ── Work Reports Module ──────────────────────────────────────

export type WorkReportStatus = "pending" | "in_progress" | "completed";

export interface WorkReport {
  id: string;
  user_id: string;
  category: EmployeeCategory;
  sub_category: string;
  title: string;
  description: string | null;
  hours_spent: number;
  status: WorkReportStatus;
  report_date: string;
  created_at: string;
  updated_at: string;
}

export interface WorkReportWithProfile extends WorkReport {
  full_name: string;
  email: string;
}
