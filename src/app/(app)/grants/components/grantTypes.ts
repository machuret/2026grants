export type Decision = "Apply" | "Maybe" | "No" | "Rejected" | null;
export type Effort = "Low" | "Medium" | "High" | null;
export type CrmStatus = "Researching" | "Pipeline" | "Active" | "Submitted" | "Won" | "Lost" | null;

export const DECISION_STYLES: Record<string, string> = {
  Apply: "bg-green-100 text-green-700",
  Maybe: "bg-yellow-100 text-yellow-700",
  No: "bg-red-100 text-red-700",
  Rejected: "bg-gray-200 text-gray-600",
};

export const EFFORT_STYLES: Record<string, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-red-100 text-red-700",
};

export const CRM_STATUS_STYLES: Record<string, string> = {
  Researching: "bg-blue-100 text-blue-700",
  Pipeline: "bg-purple-100 text-purple-700",
  Active: "bg-brand-100 text-brand-700",
  Submitted: "bg-orange-100 text-orange-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-gray-100 text-gray-500",
};

export interface GrantAnalysis {
  fitScore: number;
  matchPercentage: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}
