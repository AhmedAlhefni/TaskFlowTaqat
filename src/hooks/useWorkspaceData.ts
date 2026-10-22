import { useEffect, useState } from "react";
import type { Project, Task } from "@/src/types";
import { subscribeUserProjects } from "@/src/services/projectService";
import { subscribeProjectTasks } from "@/src/services/taskService";
import { localStore } from "@/src/services/localStore";

/** Loads server-confirmed projects and subscribes to tasks only for those projects. */
export function useWorkspaceData(userId: string | null, authLoading: boolean) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [allTasksMap, setAllTasksMap] = useState<Record<string, Task[]>>({});
  const [confirmedUserId, setConfirmedUserId] = useState<string | null>(null);
  const [failedUserId, setFailedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    setProjects([]);
    setProjectsLoaded(false);
    setAllTasksMap({});
    setConfirmedUserId(null);
    setFailedUserId(null);
    if (!userId) return;

    let isCurrentSubscription = true;
    let timeoutId: number | undefined;
    const failIfUnconfirmed = () => {
      if (!isCurrentSubscription) return;
      setProjects([]);
      setProjectsLoaded(true);
      setConfirmedUserId(null);
      setFailedUserId(userId);
    };
    timeoutId = window.setTimeout(failIfUnconfirmed, 12000);

    const unsubscribe = subscribeUserProjects(
      userId,
      (updatedProjects, serverConfirmed) => {
        if (!isCurrentSubscription) return;
        if (!serverConfirmed) {
          if (timeoutId === undefined) timeoutId = window.setTimeout(failIfUnconfirmed, 12000);
          setProjects([]);
          setProjectsLoaded(false);
          setAllTasksMap({});
          setConfirmedUserId(null);
          return;
        }
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        timeoutId = undefined;
        setProjects(updatedProjects);
        setProjectsLoaded(true);
        setConfirmedUserId(userId);
        setFailedUserId(null);
      },
      (error) => {
        if (!isCurrentSubscription) return;
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        timeoutId = undefined;
        console.error("Failed to subscribe to projects:", error);
        setProjects([]);
        setProjectsLoaded(true);
        setConfirmedUserId(null);
        setFailedUserId(userId);
      }
    );

    return () => {
      isCurrentSubscription = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [userId, authLoading]);

  useEffect(() => {
    const activeProjectIds = new Set(projects.map((project) => project.id));

    setAllTasksMap((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous).filter(([projectId]) => activeProjectIds.has(projectId))
      );
      return Object.keys(next).length === Object.keys(previous).length ? previous : next;
    });
    localStore.cleanupOrphanTasks(projects.map((project) => project.id));

    if (projects.length === 0) return;

    const unsubscribers = projects.map((project) =>
      subscribeProjectTasks(
        project.id,
        (tasks) => setAllTasksMap((previous) => ({ ...previous, [project.id]: tasks })),
        (error) => console.error(`Failed to subscribe to tasks for project ${project.id}:`, error)
      )
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [projects]);

  const accessConfirmed = Boolean(userId && confirmedUserId === userId);
  return {
    projects: accessConfirmed ? projects : [],
    projectsLoaded: accessConfirmed ? projectsLoaded : failedUserId === userId,
    loadFailed: Boolean(userId && failedUserId === userId),
    allTasksMap: accessConfirmed ? allTasksMap : {},
    setAllTasksMap,
  };
}
