export type Role = "employee" | "cre" | "hr_finance" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
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
