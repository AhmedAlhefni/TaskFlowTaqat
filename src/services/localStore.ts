import { Project, Task, Activity, UserProfile } from "@/src/types";

const PROJECTS_KEY = "taskflow_local_projects";
const TASKS_KEY = "taskflow_local_tasks";
const ACTIVITIES_KEY = "taskflow_local_activities";

export const localStore = {
  getProjects(userId?: string): Project[] {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      const all: Project[] = JSON.parse(raw);
      if (!userId) return all;
      return all.filter((p) => p.memberIds?.includes(userId) || p.ownerId === userId);
    } catch {
      return [];
    }
  },

  getProject(projectId: string): Project | null {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return null;
      const all: Project[] = JSON.parse(raw);
      return all.find((p) => p.id === projectId) || null;
    } catch {
      return null;
    }
  },

  saveProject(project: Project): void {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      const all: Project[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex((p) => p.id === project.id);
      if (idx >= 0) {
        all[idx] = project;
      } else {
        all.unshift(project);
      }
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent("taskflow_local_projects_change"));
    } catch (e) {
      console.warn("Error saving to localStore:", e);
    }
  },

  /** Remove this user's cached project data when a server snapshot revokes access. */
  reconcileProjectsForUser(userId: string, authorizedProjects: Project[]): void {
    try {
      const rawProjects = localStorage.getItem(PROJECTS_KEY);
      const cachedProjects: Project[] = rawProjects ? JSON.parse(rawProjects) : [];
      const indexKey = `taskflow_cached_projects_${userId}`;
      const rawKnownIds = localStorage.getItem(indexKey);
      const knownIds: string[] = rawKnownIds ? JSON.parse(rawKnownIds) : [];
      const authorizedIds = new Set(authorizedProjects.map((project) => project.id));
      const revokedIds = new Set(knownIds.filter((projectId) => !authorizedIds.has(projectId)));

      cachedProjects.forEach((project) => {
        const wasAssociatedWithUser = project.ownerId === userId || project.memberIds?.includes(userId);
        if (wasAssociatedWithUser && !authorizedIds.has(project.id)) revokedIds.add(project.id);
      });

      if (revokedIds.size > 0) {
        localStorage.setItem(
          PROJECTS_KEY,
          JSON.stringify(cachedProjects.filter((project) => !revokedIds.has(project.id)))
        );
        revokedIds.forEach((projectId) => {
          this.deleteProjectTasks(projectId);
          this.deleteProjectActivities(projectId);
        });
      }

      localStorage.setItem(indexKey, JSON.stringify([...authorizedIds]));
      window.dispatchEvent(new CustomEvent("taskflow_local_projects_change"));
    } catch (error) {
      console.warn("Error reconciling cached projects:", error);
    }
  },

  deleteProject(projectId: string): void {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (raw) {
        const all: Project[] = JSON.parse(raw);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(all.filter((p) => p.id !== projectId)));
      }
      // Also clean up tasks and activities
      this.deleteProjectTasks(projectId);
      this.deleteProjectActivities(projectId);
      window.dispatchEvent(new CustomEvent("taskflow_local_projects_change"));
    } catch (e) {
      console.warn("Error deleting from localStore:", e);
    }
  },

  getTasks(projectId: string): Task[] {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (!raw) return [];
      const all: Task[] = JSON.parse(raw);
      return all.filter((t) => t.projectId === projectId);
    } catch {
      return [];
    }
  },

  saveTask(task: Task): void {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      const all: Task[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        all[idx] = task;
      } else {
        all.unshift(task);
      }
      localStorage.setItem(TASKS_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent(`taskflow_local_tasks_${task.projectId}`));
    } catch (e) {
      console.warn("Error saving task to localStore:", e);
    }
  },

  saveProjectTasks(projectId: string, tasks: Task[]): void {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      const all: Task[] = raw ? JSON.parse(raw) : [];
      const otherProjectsTasks = all.filter((t) => t.projectId !== projectId);
      const updated = [...otherProjectsTasks, ...tasks];
      localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Error saving project tasks to localStore:", e);
    }
  },

  deleteTask(projectId: string, taskId: string): void {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (raw) {
        const all: Task[] = JSON.parse(raw);
        localStorage.setItem(TASKS_KEY, JSON.stringify(all.filter((t) => t.id !== taskId)));
        window.dispatchEvent(new CustomEvent(`taskflow_local_tasks_${projectId}`));
      }
    } catch (e) {
      console.warn("Error deleting task from localStore:", e);
    }
  },

  deleteProjectTasks(projectId: string): void {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (raw) {
        const all: Task[] = JSON.parse(raw);
        localStorage.setItem(TASKS_KEY, JSON.stringify(all.filter((t) => t.projectId !== projectId)));
        window.dispatchEvent(new CustomEvent(`taskflow_local_tasks_${projectId}`));
      }
    } catch (e) {
      console.warn("Error clearing project tasks in localStore:", e);
    }
  },

  cleanupOrphanTasks(validProjectIds: string[]): void {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (!raw) return;
      const all: Task[] = JSON.parse(raw);
      const validSet = new Set(validProjectIds);
      const filtered = all.filter((t) => validSet.has(t.projectId));
      if (filtered.length !== all.length) {
        localStorage.setItem(TASKS_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn("Error cleaning up orphan tasks in localStore:", e);
    }
  },

  getActivities(projectId: string): Activity[] {
    try {
      const raw = localStorage.getItem(ACTIVITIES_KEY);
      if (!raw) return [];
      const all: Activity[] = JSON.parse(raw);
      return all.filter((a) => a.projectId === projectId);
    } catch {
      return [];
    }
  },

  saveActivity(activity: Activity): void {
    try {
      const raw = localStorage.getItem(ACTIVITIES_KEY);
      const all: Activity[] = raw ? JSON.parse(raw) : [];
      all.unshift(activity);
      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(all.slice(0, 50)));
      window.dispatchEvent(new CustomEvent(`taskflow_local_activities_${activity.projectId}`));
    } catch (e) {
      console.warn("Error saving activity to localStore:", e);
    }
  },

  deleteProjectActivities(projectId: string): void {
    try {
      const raw = localStorage.getItem(ACTIVITIES_KEY);
      if (raw) {
        const all: Activity[] = JSON.parse(raw);
        localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(all.filter((a) => a.projectId !== projectId)));
      }
    } catch (e) {
      console.warn("Error clearing project activities in localStore:", e);
    }
  },
};
