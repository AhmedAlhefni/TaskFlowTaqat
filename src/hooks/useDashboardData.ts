import { useMemo } from "react";
import type { Project, Task } from "@/src/types";
import { isTaskOverdue } from "@/src/lib/dateUtils";

export type DashboardTaskFilter = "all" | "my" | "in_progress" | "done" | "todo" | "overdue";
type ProjectRoleFilter = "all" | "owned" | "member";

export function useDashboardData(
  projects: Project[],
  allTasksMap: Record<string, Task[]>,
  userId: string,
  taskFilter: DashboardTaskFilter,
  taskSearch: string,
  projectRoleFilter: ProjectRoleFilter
) {
  const activeProjectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects]);
  const allTasks = useMemo(
    () => Object.entries(allTasksMap)
      .filter(([projectId]) => activeProjectIds.has(projectId))
      .flatMap(([, tasks]) => tasks),
    [allTasksMap, activeProjectIds]
  );

  const ownedProjects = useMemo(() => projects.filter((project) => project.ownerId === userId), [projects, userId]);
  const memberOnlyProjects = useMemo(() => projects.filter((project) => project.ownerId !== userId), [projects, userId]);
  const visibleProjects = useMemo(
    () => projectRoleFilter === "owned"
      ? ownedProjects
      : projectRoleFilter === "member"
        ? memberOnlyProjects
        : projects,
    [projectRoleFilter, ownedProjects, memberOnlyProjects, projects]
  );

  const todoTasks = useMemo(() => allTasks.filter((task) => task.status === "todo"), [allTasks]);
  const inProgressTasks = useMemo(() => allTasks.filter((task) => task.status === "in_progress"), [allTasks]);
  const doneTasks = useMemo(() => allTasks.filter((task) => task.status === "done"), [allTasks]);
  const overdueTasks = useMemo(() => allTasks.filter(isTaskOverdue), [allTasks]);
  const highPriorityTasks = useMemo(() => allTasks.filter((task) => task.priority === "high"), [allTasks]);
  const mediumPriorityTasks = useMemo(() => allTasks.filter((task) => task.priority === "medium"), [allTasks]);
  const lowPriorityTasks = useMemo(() => allTasks.filter((task) => task.priority === "low"), [allTasks]);
  const myAssignedTasks = useMemo(() => allTasks.filter((task) => task.assigneeId === userId), [allTasks, userId]);
  const myPendingTasks = useMemo(() => myAssignedTasks.filter((task) => task.status !== "done"), [myAssignedTasks]);

  const totalTasks = allTasks.length;
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
  const inProgressPercent = totalTasks > 0 ? Math.round((inProgressTasks.length / totalTasks) * 100) : 0;
  const todoPercent = totalTasks > 0 ? Math.max(0, 100 - overallProgress - inProgressPercent) : 0;

  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );
  const displayTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    return allTasks.filter((task) => {
      if (query && !task.title.toLowerCase().includes(query) && !(task.description || "").toLowerCase().includes(query)) {
        return false;
      }
      if (taskFilter === "my") return task.assigneeId === userId;
      if (taskFilter === "in_progress") return task.status === "in_progress";
      if (taskFilter === "done") return task.status === "done";
      if (taskFilter === "todo") return task.status === "todo";
      if (taskFilter === "overdue") return isTaskOverdue(task);
      return true;
    });
  }, [allTasks, taskFilter, taskSearch, userId]);

  return {
    ownedProjects, memberOnlyProjects, visibleProjects, allTasks, totalTasks,
    todoTasks, inProgressTasks, doneTasks, overdueTasks,
    highPriorityTasks, mediumPriorityTasks, lowPriorityTasks,
    myAssignedTasks, myPendingTasks, overallProgress, inProgressPercent,
    todoPercent, projectMap, displayTasks,
  };
}
