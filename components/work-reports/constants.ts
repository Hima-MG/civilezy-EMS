import type { EmployeeCategory } from "@/types";

export const CATEGORY_LABELS: Record<EmployeeCategory, string> = {
  content_creator: "Content Creator",
  tech_lead: "Tech Lead",
  digital_marketer: "Digital Marketer",
};

export const SUBCATEGORIES: Record<EmployeeCategory, string[]> = {
  content_creator: [
    "Smart Lesson Creation",
    "Civilezy Civil War",
    "File Uploading",
    "Content Editing",
    "Others",
  ],
  tech_lead: [
    "App Related Works",
    "EasyCourse Issues",
    "Poster Creation",
    "ERP Maintenance",
    "Bug Fixes",
    "Others",
  ],
  digital_marketer: [
    "Ad Running",
    "Social Media Management",
    "Campaign Planning",
    "Analytics",
    "Lead Campaigns",
    "Others",
  ],
};

export const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "text-yellow-700 bg-yellow-50 border-yellow-200",
  },
  in_progress: {
    label: "In Progress",
    className: "text-blue-700 bg-blue-50 border-blue-200",
  },
  completed: {
    label: "Completed",
    className: "text-green-700 bg-green-50 border-green-200",
  },
} as const;
