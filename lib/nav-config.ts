import type { NavItem, Role } from "@/types";

const employeeNav: NavItem[] = [
  { title: "Dashboard",     href: "/employee",                   icon: "LayoutDashboard" },
  { title: "Attendance",    href: "/employee?tab=attendance",    icon: "Clock" },
  { title: "Tasks",         href: "/employee?tab=tasks",         icon: "CheckSquare" },
  { title: "Leave",         href: "/employee?tab=leaves",        icon: "CalendarOff" },
  { title: "Work Reports",  href: "/employee/work-reports",      icon: "ClipboardList" },
  { title: "Meetings",      href: "/employee?tab=meetings",      icon: "Calendar" },
  { title: "Profile",       href: "/employee?tab=profile",       icon: "User" },
];

const creNav: NavItem[] = [
  { title: "Dashboard",   href: "/cre",                  icon: "LayoutDashboard" },
  { title: "Leads",       href: "/cre?tab=leads",        icon: "Users" },
  { title: "Follow-ups",  href: "/cre?tab=followups",    icon: "Phone" },
  { title: "Notes",       href: "/cre?tab=notes",        icon: "FileText" },
  { title: "Analytics",   href: "/cre?tab=analytics",    icon: "BarChart2" },
  { title: "Profile",     href: "/cre?tab=profile",      icon: "User" },
];

const hrNav: NavItem[] = [
  { title: "Dashboard",    href: "/hr",                  icon: "LayoutDashboard" },
  { title: "Attendance",   href: "/hr?tab=attendance",   icon: "Clock" },
  { title: "Leaves",       href: "/hr?tab=leaves",       icon: "CalendarOff" },
  { title: "Payroll",      href: "/hr?tab=payroll",      icon: "DollarSign" },
  { title: "Employees",    href: "/hr?tab=employees",    icon: "Users" },
  { title: "Payments",     href: "/hr?tab=payments",     icon: "CreditCard" },
  { title: "Work Reports", href: "/hr/work-reports",     icon: "ClipboardList" },
];

const adminNav: NavItem[] = [
  { title: "Overview",   href: "/admin",                  icon: "LayoutDashboard" },
  { title: "Employees",  href: "/admin?tab=employees",    icon: "UserCheck" },
  { title: "Work Audit", href: "/admin/work-reports",     icon: "ClipboardList" },
  { title: "Students",   href: "/admin?tab=students",     icon: "GraduationCap" },
  { title: "Renewals",   href: "/admin?tab=renewals",     icon: "RefreshCw" },
  { title: "Finance",    href: "/admin?tab=finance",      icon: "DollarSign" },
  { title: "CRM",        href: "/admin?tab=crm",          icon: "Target" },
  { title: "HR",         href: "/admin?tab=hr",           icon: "Briefcase" },
  { title: "Analytics",  href: "/admin?tab=analytics",    icon: "LineChart" },
  { title: "Settings",   href: "/admin?tab=settings",     icon: "Settings" },
];

export const NAV_CONFIG: Record<Role, NavItem[]> = {
  employee: employeeNav,
  cre: creNav,
  hr_finance: hrNav,
  admin: adminNav,
};
