import { useMemo } from "react";
import type { Task, TaskFilters } from "@/src/types";
import { isTaskOverdue } from "@/src/lib/dateUtils";

const getCreatedAtTime = (value: Task["createdAt"]): number => {
  if (typeof value === "string") return Date.parse(value) || 0;
  return value?.toDate?.().getTime() || 0;
};

export function useProjectTaskFilters(tasks: Task[], filters: TaskFilters): Task[] {
  return useMemo(() => tasks
    .filter((task) => {
      const query = filters.searchQuery.trim().toLowerCase();
      if (query && !task.title.toLowerCase().includes(query) && !(task.description || "").toLowerCase().includes(query)) {
        return false;
      }
      if (filters.status !== "all" && task.status !== filters.status) return false;
      if (filters.priority !== "all" && task.priority !== filters.priority) return false;
      if (filters.assigneeId === "unassigned" && task.assigneeId !== null) return false;
      if (filters.assigneeId !== "all" && filters.assigneeId !== "unassigned" && task.assigneeId !== filters.assigneeId) return false;
      if (filters.isOverdueOnly && !isTaskOverdue(task)) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "dueDate_asc") {
        if (!a.dueDate) return b.dueDate ? 1 : 0;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (filters.sortBy === "dueDate_desc") {
        if (!a.dueDate) return b.dueDate ? 1 : 0;
        if (!b.dueDate) return -1;
        return b.dueDate.localeCompare(a.dueDate);
      }
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (filters.sortBy === "priority_desc") return priorityWeight[b.priority] - priorityWeight[a.priority];
      if (filters.sortBy === "priority_asc") return priorityWeight[a.priority] - priorityWeight[b.priority];
      return getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt);
    }), [tasks, filters]);
}
