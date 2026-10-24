import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

export type AppView = "dashboard" | "projects" | "project-detail" | "my-tasks" | "not-found";
export type AuthRouteMode = "login" | "register" | null;

export interface AppRoute {
  view: AppView;
  projectId: string | null;
  createProject: boolean;
  settings: boolean;
  authMode: AuthRouteMode;
}

export function readAppRoute(): AppRoute {
  try {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "/dashboard") return { view: "dashboard", projectId: null, createProject: false, settings: false, authMode: null };
    if (path === "/login") return { view: "dashboard", projectId: null, createProject: false, settings: false, authMode: "login" };
    if (path === "/register") return { view: "dashboard", projectId: null, createProject: false, settings: false, authMode: "register" };
    if (path === "/projects/new") return { view: "projects", projectId: null, createProject: true, settings: false, authMode: null };
    if (path === "/projects") return { view: "projects", projectId: null, createProject: false, settings: false, authMode: null };
    if (path === "/my-tasks") return { view: "my-tasks", projectId: null, createProject: false, settings: false, authMode: null };

    const projectMatch = path.match(/^\/projects\/([^/]+)(\/settings)?$/);
    if (projectMatch && projectMatch[1] !== "new") {
      return {
        view: "project-detail",
        projectId: decodeURIComponent(projectMatch[1]),
        createProject: false,
        settings: Boolean(projectMatch[2]),
        authMode: null,
      };
    }

    const hash = window.location.hash;
    if (hash.startsWith("#/project/")) {
      const projectId = hash.slice("#/project/".length).trim();
      if (projectId) return { view: "project-detail", projectId, createProject: false, settings: false, authMode: null };
    }
    if (hash === "#/projects") return { view: "projects", projectId: null, createProject: false, settings: false, authMode: null };
    if (hash === "#/my-tasks") return { view: "my-tasks", projectId: null, createProject: false, settings: false, authMode: null };
    if (hash === "#/dashboard" || hash === "#/") return { view: "dashboard", projectId: null, createProject: false, settings: false, authMode: null };

    return { view: "not-found", projectId: null, createProject: false, settings: false, authMode: null };
  } catch {
    return { view: "not-found", projectId: null, createProject: false, settings: false, authMode: null };
  }
}

interface AppRoutingState {
  currentView: AppView;
  setCurrentView: Dispatch<SetStateAction<AppView>>;
  selectedProjectId: string | null;
  setSelectedProjectId: Dispatch<SetStateAction<string | null>>;
  createProjectOpen: boolean;
  setCreateProjectOpen: Dispatch<SetStateAction<boolean>>;
  projectSettingsRoute: boolean;
  setProjectSettingsRoute: Dispatch<SetStateAction<boolean>>;
  authRouteMode: AuthRouteMode;
  setAuthRouteMode: Dispatch<SetStateAction<AuthRouteMode>>;
  isAuthenticated: boolean;
  authLoading: boolean;
}

/** Keeps URL, browser history and the selected screen in sync. */
export function useAppRouting(state: AppRoutingState): void {
  const {
    currentView, setCurrentView, selectedProjectId, setSelectedProjectId,
    createProjectOpen, setCreateProjectOpen, projectSettingsRoute,
    setProjectSettingsRoute, authRouteMode, setAuthRouteMode, isAuthenticated, authLoading,
  } = state;

  useEffect(() => {
    if (authLoading) return;
    let targetPath = "/dashboard";
    if (!isAuthenticated) {
      targetPath = `/${authRouteMode || "login"}`;
      if (currentView === "not-found") {
        setCurrentView("dashboard");
        setSelectedProjectId(null);
        setCreateProjectOpen(false);
        setProjectSettingsRoute(false);
      }
    } else if (currentView === "not-found") {
      return;
    } else if (createProjectOpen) {
      targetPath = "/projects/new";
    } else if (currentView === "project-detail" && selectedProjectId) {
      targetPath = `/projects/${encodeURIComponent(selectedProjectId)}${projectSettingsRoute ? "/settings" : ""}`;
    } else if (currentView === "projects") {
      targetPath = "/projects";
    } else if (currentView === "my-tasks") {
      targetPath = "/my-tasks";
    }

    if (window.location.pathname !== targetPath || window.location.hash) {
      if (!isAuthenticated && !authRouteMode) {
        window.history.replaceState(null, "", targetPath);
      } else {
        window.history.pushState(null, "", targetPath);
      }
    }
  }, [currentView, selectedProjectId, createProjectOpen, projectSettingsRoute, isAuthenticated, authRouteMode, authLoading, setCurrentView, setSelectedProjectId, setCreateProjectOpen, setProjectSettingsRoute]);

  useEffect(() => {
    const syncFromHistory = () => {
      const route = readAppRoute();
      setCurrentView(route.view);
      setSelectedProjectId(route.projectId);
      setCreateProjectOpen(route.createProject);
      setProjectSettingsRoute(route.settings);
      setAuthRouteMode(route.authMode);
    };
    window.addEventListener("popstate", syncFromHistory);
    window.addEventListener("hashchange", syncFromHistory);
    return () => {
      window.removeEventListener("popstate", syncFromHistory);
      window.removeEventListener("hashchange", syncFromHistory);
    };
  }, [setCurrentView, setSelectedProjectId, setCreateProjectOpen, setProjectSettingsRoute, setAuthRouteMode]);
}
