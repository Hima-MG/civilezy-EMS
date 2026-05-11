import type { NavItem, Role } from "@/types";

const employeeNav: NavItem[] = [
  { title: "Overview", href: "/employee", icon: "LayoutDashboard" },
  { title: "My Profile", href: "/employee/profile", icon: "User" },
  { title: "Attendance", href: "/employee/attendance", icon: "Clock" },
  { title: "Leave Requests", href: "/employee/leaves", icon: "CalendarOff" },
  { title: "Payslips", href: "/employee/payslips", icon: "FileText" },
  { title: "Tasks", href: "/employee/tasks", icon: "CheckSquare" },
];

const creNav: NavItem[] = [
  { title: "Overview", href: "/cre", icon: "LayoutDashboard" },
  { title: "Leads", href: "/cre/leads", icon: "Users" },
  { title: "Projects", href: "/cre/projects", icon: "Building2" },
  { title: "Site Visits", href: "/cre/site-visits", icon: "MapPin" },
  { title: "Quotations", href: "/cre/quotations", icon: "FileText" },
  { title: "Follow-ups", href: "/cre/follow-ups", icon: "Phone" },
  { title: "Reports", href: "/cre/reports", icon: "BarChart2" },
];

const hrNav: NavItem[] = [
  { title: "Overview", href: "/hr", icon: "LayoutDashboard" },
  { title: "Employees", href: "/hr/employees", icon: "Users" },
  { title: "Attendance", href: "/hr/attendance", icon: "Clock" },
  { title: "Leave Management", href: "/hr/leaves", icon: "CalendarOff" },
  { title: "Payroll", href: "/hr/payroll", icon: "DollarSign" },
  { title: "Recruitment", href: "/hr/recruitment", icon: "UserPlus" },
  { title: "Finance", href: "/hr/finance", icon: "TrendingUp" },
  { title: "Reports", href: "/hr/reports", icon: "BarChart2" },
];

const adminNav: NavItem[] = [
  { title: "Overview", href: "/admin", icon: "LayoutDashboard" },
  { title: "Users", href: "/admin/users", icon: "Users" },
  { title: "Employees", href: "/admin/employees", icon: "UserCheck" },
  { title: "Projects", href: "/admin/projects", icon: "Building2" },
  { title: "CRM", href: "/admin/crm", icon: "Target" },
  { title: "HR & Finance", href: "/admin/hr", icon: "Briefcase" },
  { title: "Analytics", href: "/admin/analytics", icon: "LineChart" },
  { title: "Settings", href: "/admin/settings", icon: "Settings" },
  { title: "Audit Logs", href: "/admin/audit", icon: "Shield" },
];

export const NAV_CONFIG: Record<Role, NavItem[]> = {
  employee: employeeNav,
  cre: creNav,
  hr_finance: hrNav,
  admin: adminNav,
};
