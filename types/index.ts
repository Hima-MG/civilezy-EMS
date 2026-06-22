export type Role = "employee" | "cre" | "hr_finance" | "admin";

export type EmployeeCategory =
  | "content_creator"
  | "content_manager"
  | "tech_lead"
  | "digital_marketer"
  | "management"
  | "finance"
  | "sales";

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
  | { success: true; data: T; message?: string; redirectTo?: string }
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
export type WorkReportApprovalStatus = "pending" | "approved" | "rejected";

export interface WorkReport {
  id: string;
  user_id: string;
  category: EmployeeCategory;
  sub_category: string;
  title: string;
  description: string | null;
  hours_spent: number;
  status: WorkReportStatus;
  approval_status: WorkReportApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  report_date: string;
  created_at: string;
  updated_at: string;
}

export interface WorkReportWithProfile extends WorkReport {
  full_name: string;
  email: string;
}

// ── EzyCourse Integration (discovery phase) ──────────────────

export type ProcessingStatus = "pending" | "processed" | "failed";

export interface WebhookLog {
  id: string;
  source: string;
  event_type: string | null;
  payload: unknown;
  headers: Record<string, string>;
  processed: boolean;
  processing_status: ProcessingStatus;
  retry_count: number;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone_number: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  ezycourse_school_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoursePurchase {
  id: string;
  ezycourse_order_id: string;
  student_id: string;
  product_id: string;
  product_name: string;
  product_type: string;
  product_owner_id: string | null;
  product_owner_email: string | null;
  price: number;
  gateway: string | null;
  interval: string | null;
  interval_count: number | null;
  coupon_code: string | null;
  expiry_date: string | null;
  metadata: unknown;
  webhook_log_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipRenewal {
  id: string;
  membership_id: string;
  student_id: string;
  membership_type: string | null;
  membership_status: string | null;
  change_type: string | null;
  product_name: string | null;
  price: number | null;
  gateway: string | null;
  currency: string | null;
  school_id: string | null;
  seller_id: string | null;
  expiry_date: string | null;
  webhook_log_id: string | null;
  created_at: string;
}

export type ActivityType = "registration" | "purchase" | "renewal" | "expiry" | "payment" | "refund";

export interface ActivityLog {
  id: string;
  student_id: string;
  activity_type: ActivityType;
  description: string | null;
  metadata: unknown;
  source_table: string | null;
  source_id: string | null;
  occurred_at: string;
  created_at: string;
}

export type RenewalQueueStatus =
  | "pending_payment"
  | "payment_received"
  | "verification_pending"
  | "ready_for_renewal"
  | "renewed"
  | "follow_up_required";

export interface RenewalQueueEntry {
  id: string;
  student_id: string;
  membership_id: string | null;
  product_name: string | null;
  amount: number | null;
  due_date: string | null;
  status: RenewalQueueStatus;
  payment_reference: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StudentWithMembership extends Student {
  membership_status: string | null;
  membership_type: string | null;
  product_name: string | null;
  expiry_date: string | null;
  price: number | null;
  currency: string | null;
}

export interface RenewalQueueEntryWithStudent extends RenewalQueueEntry {
  student_name: string;
  student_email: string;
  student_phone: string | null;
}

export interface WorkReportReview {
  id: string;
  work_report_id: string;
  action: "approved" | "rejected";
  reviewed_by: string;
  note: string | null;
  created_at: string;
}
