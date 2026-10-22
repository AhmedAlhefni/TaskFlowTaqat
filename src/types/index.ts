import { Timestamp } from "firebase/firestore";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface ProjectMemberInfo {
  uid: string;
  email: string;
  displayName: string;
  role: "owner" | "member";
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  members?: Record<string, { email: string; displayName: string }>;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  version: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  createdBy: string;
  creatorName?: string | null;
  dueDate: string | null; // Stored as ISO/YYYY-MM-DD for deterministic calendar date comparisons
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  version: number;
}

export type ActivityAction =
  | "project_created"
  | "project_updated"
  | "member_added"
  | "member_removed"
  | "task_created"
  | "task_updated"
  | "task_reassigned"
  | "task_status_changed"
  | "task_deleted";

export interface Activity {
  id: string;
  projectId: string;
  actorUid: string;
  actorName: string;
  action: ActivityAction;
  entityType: "project" | "task" | "membership";
  entityId: string;
  summary: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp | string;
}

export interface TaskFilters {
  searchQuery: string;
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  assigneeId: string | "all" | "unassigned";
  isOverdueOnly: boolean;
  sortBy: "dueDate_asc" | "dueDate_desc" | "priority_desc" | "priority_asc" | "created_desc";
}

export type Theme = "light" | "dark";
export type Language = "ar" | "en";
