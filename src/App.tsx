import React, { useState, useEffect } from "react";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { LanguageProvider, useLanguage } from "@/src/context/LanguageContext";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { ToastProvider, useToast } from "@/src/components/common/Toast";
import { Navbar } from "@/src/components/layout/Navbar";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { AuthScreen } from "@/src/components/auth/AuthScreen";
import { DashboardOverview } from "@/src/components/dashboard/DashboardOverview";
import { ProjectsListView } from "@/src/components/projects/ProjectsListView";
import { ProjectDetailView } from "@/src/components/projects/ProjectDetailView";
import { MyTasksView } from "@/src/components/tasks/MyTasksView";
import { ProjectModal } from "@/src/components/projects/ProjectModal";
import { ProjectOnboardingModal } from "@/src/components/projects/ProjectOnboardingModal";
import { ProjectSettingsModal } from "@/src/components/projects/ProjectSettingsModal";
import { TaskModal } from "@/src/components/tasks/TaskModal";
import { Project, Task, Activity, ProjectMemberInfo } from "@/src/types";
import {
  subscribeUserProjects,
  createProject,
  getProject,
  updateProject,
  addProjectMember,
  removeProjectMember,
  deleteProject,
} from "@/src/services/projectService";
import { subscribeProjectTasks, createTask } from "@/src/services/taskService";
import { getProjectActivities } from "@/src/services/activityService";
import { FirestoreRulesBanner } from "@/src/components/common/FirestoreRulesBanner";
import { localStore } from "@/src/services/localStore";

// Read both the current path URLs and legacy hash URLs so existing bookmarks keep working.
const getInitialRoute = (): {
  view: "dashboard" | "projects" | "project-detail" | "my-tasks";
  projectId: string | null;
  createProject: boolean;
  settings: boolean;
} => {
  try {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/projects/new") return { view: "projects", projectId: null, createProject: true, settings: false };
    if (path === "/projects") return { view: "projects", projectId: null, createProject: false, settings: false };
    if (path === "/my-tasks") return { view: "my-tasks", projectId: null, createProject: false, settings: false };
    const projectMatch = path.match(/^\/projects\/([^/]+)(\/settings)?$/);
    if (projectMatch && projectMatch[1] !== "new") {
      return { view: "project-detail", projectId: decodeURIComponent(projectMatch[1]), createProject: false, settings: !!projectMatch[2] };
    }
    if (path === "/" || path === "/dashboard") return { view: "dashboard", projectId: null, createProject: false, settings: false };

    const hash = window.location.hash;
    if (hash.startsWith("#/project/")) {
      const pId = hash.replace("#/project/", "").trim();
      if (pId) return { view: "project-detail", projectId: pId, createProject: false, settings: false };
    }
    if (hash === "#/projects") return { view: "projects", projectId: null, createProject: false, settings: false };
    if (hash === "#/my-tasks") return { view: "my-tasks", projectId: null, createProject: false, settings: false };

  } catch {}
  return { view: "dashboard", projectId: null, createProject: false, settings: false };
};

function MainApp() {
  const { currentUser, userProfile, loading } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const initialRoute = React.useMemo(() => getInitialRoute(), []);
  const initialAuthMode = window.location.pathname === "/register" ? "register" : window.location.pathname === "/login" ? "login" : null;
  const [authRouteMode, setAuthRouteMode] = useState<"login" | "register" | null>(initialAuthMode);

  const [currentView, setCurrentView] = useState<"dashboard" | "projects" | "project-detail" | "my-tasks">(
    initialRoute.view
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialRoute.projectId);
  const [isProjectSettingsRoute, setIsProjectSettingsRoute] = useState(initialRoute.settings);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  const [allTasksMap, setAllTasksMap] = useState<Record<string, Task[]>>({});

  const [currentProjectActivities, setCurrentProjectActivities] = useState<Activity[]>([]);

  // Modals state
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(initialRoute.createProject);
  const [isGlobalCreateTaskOpen, setIsGlobalCreateTaskOpen] = useState(false);
  const [onboardingProject, setOnboardingProject] = useState<Project | null>(null);
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"general" | "members">("general");
  const [dashboardTaskFilter, setDashboardTaskFilter] = useState<"all" | "my" | "in_progress" | "done" | "todo" | "overdue">("all");

  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Keep the URL in sync with the selected view and create a real browser history entry.
  useEffect(() => {
    let targetPath = !currentUser && authRouteMode ? `/${authRouteMode}` : "/dashboard";
    if (isCreateProjectModalOpen) targetPath = "/projects/new";
    else if (!(!currentUser && authRouteMode) && currentView === "project-detail" && selectedProjectId) {
      targetPath = `/projects/${encodeURIComponent(selectedProjectId)}${isProjectSettingsRoute ? "/settings" : ""}`;
    } else if (!(!currentUser && authRouteMode) && currentView === "projects") {
      targetPath = "/projects";
    } else if (!(!currentUser && authRouteMode) && currentView === "my-tasks") {
      targetPath = "/my-tasks";
    }
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, "", targetPath);
    }
  }, [currentView, selectedProjectId, isCreateProjectModalOpen, isProjectSettingsRoute, currentUser, authRouteMode]);

  // Back/Forward changes route state without creating another history entry.
  useEffect(() => {
    const readRoute = () => {
      const route = getInitialRoute();
      setCurrentView(route.view);
      setSelectedProjectId(route.projectId);
      setIsCreateProjectModalOpen(route.createProject);
      setIsProjectSettingsRoute(route.settings);
      setAuthRouteMode(window.location.pathname === "/register" ? "register" : window.location.pathname === "/login" ? "login" : null);
    };
    window.addEventListener("popstate", readRoute);
    window.addEventListener("hashchange", readRoute);
    return () => {
      window.removeEventListener("popstate", readRoute);
      window.removeEventListener("hashchange", readRoute);
    };
  }, []);

  // Manage authentication lifecycle and project subscription
  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      setDashboardTaskFilter("all");
      setCurrentProjectActivities([]);
      setIsGlobalCreateTaskOpen(false);
      setOnboardingProject(null);
      setSettingsProject(null);
      setIsMobileSidebarOpen(false);
      setProjects([]);
      setProjectsLoaded(false);
      setAllTasksMap({});
      return;
    }

    const cachedProjects = localStore.getProjects(currentUser.uid);
    setProjects(cachedProjects);
    setProjectsLoaded(false);
    setAllTasksMap(Object.fromEntries(cachedProjects.map((project) => [project.id, localStore.getTasks(project.id)])));

    // Only reset to dashboard if a DIFFERENT user account just signed in
    const lastAuthUser = localStorage.getItem("taskflow_last_auth_user");
    if (lastAuthUser && lastAuthUser !== currentUser.uid) {
      setCurrentView("dashboard");
      setSelectedProjectId(null);
    }
    localStorage.setItem("taskflow_last_auth_user", currentUser.uid);

    const unsubscribeProjects = subscribeUserProjects(
      currentUser.uid,
      (updatedProjects) => {
        setProjects(updatedProjects);
        setProjectsLoaded(true);
      },
      (err) => {
        console.error("Failed to subscribe to projects:", err);
      }
    );

    return () => unsubscribeProjects();
  }, [currentUser, loading]);

  // Subscribe to tasks for all accessible projects to compute global KPIs & project progress
  useEffect(() => {
    const activeProjectIds = new Set(projects.map((p) => p.id));

    // 1. Immediately prune any deleted/stale project IDs from allTasksMap
    setAllTasksMap((prev) => {
      if (projects.length === 0) {
        return Object.keys(prev).length === 0 ? prev : {};
      }
      let changed = false;
      const next: Record<string, Task[]> = {};
      for (const [pId, tasks] of Object.entries(prev)) {
        if (activeProjectIds.has(pId)) {
          next[pId] = tasks;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    // 2. Also clean up any orphan tasks in local store for projects that were deleted
    localStore.cleanupOrphanTasks(projects.map((p) => p.id));

    if (projects.length === 0) {
      return;
    }

    const unsubscribers = projects.map((p) => {
      return subscribeProjectTasks(
        p.id,
        (tasks) => {
          setAllTasksMap((prev) => {
            // Guard: ensure this project is still present in active projects
            const currentActiveIds = new Set(projects.map((proj) => proj.id));
            if (!currentActiveIds.has(p.id)) {
              return prev;
            }
            return {
              ...prev,
              [p.id]: tasks,
            };
          });
        },
        (err) => {
          console.error(`Failed to subscribe to tasks for project ${p.id}:`, err);
        }
      );
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [projects]);

  // Fetch activities when selected project changes
  const fetchActivities = async (projectId: string) => {
    try {
      const acts = await getProjectActivities(projectId);
      setCurrentProjectActivities(acts);
    } catch (err) {
      console.error("Failed to load activities:", err);
    }
  };

  useEffect(() => {
    const cachedProject = selectedProjectId ? localStore.getProject(selectedProjectId) : null;
    const hasProjectAccess = Boolean(currentUser && (
      projects.some((project) => project.id === selectedProjectId) ||
      (cachedProject && (cachedProject.ownerId === currentUser.uid || cachedProject.memberIds?.includes(currentUser.uid)))
    ));
    if (selectedProjectId && hasProjectAccess) {
      fetchActivities(selectedProjectId);
    }
  }, [selectedProjectId, currentUser, projects]);

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ||
    (selectedProjectId && currentUser
      ? (() => {
          const cached = localStore.getProject(selectedProjectId);
          return cached && (cached.ownerId === currentUser.uid || cached.memberIds?.includes(currentUser.uid)) ? cached : null;
        })()
      : null);

  const handleOpenProject = (project: Project) => {
    setIsProjectSettingsRoute(false);
    setSelectedProjectId(project.id);
    setCurrentView("project-detail");
  };

  // Create Project Flow with Post-Creation Onboarding
  const handleCreateProjectSubmit = async (data: { name: string; description: string }) => {
    if (!userProfile) return;
    try {
      const newProjectId = await createProject(data.name, data.description, userProfile);
      showToast(t("taskCreatedSuccess"), "success");
      setIsCreateProjectModalOpen(false);

      // Fetch newly created project to show onboarding modal
      const fetchedProj = await getProject(newProjectId);
      const projToOnboard = fetchedProj || {
        id: newProjectId,
        name: data.name,
        description: data.description,
        ownerId: userProfile.uid,
        memberIds: [userProfile.uid],
        members: {
          [userProfile.uid]: {
            email: userProfile.email,
            displayName: userProfile.displayName,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      setSelectedProjectId(newProjectId);
      setOnboardingProject(projToOnboard);
    } catch (err: any) {
      console.error("Create project error:", err);
      showToast(err.message || t("authError"), "error");
    }
  };

  // Global Create Task Handler
  const handleGlobalCreateTask = async (data: {
    title: string;
    description: string;
    status: any;
    priority: any;
    assigneeId: string | null;
    dueDate: string | null;
    projectId?: string;
  }) => {
    if (!userProfile) return;
    const targetProjId = data.projectId || selectedProjectId || (projects[0]?.id);
    if (!targetProjId) {
      showToast(t("noEligibleProjects"), "error");
      return;
    }

    try {
      await createTask(targetProjId, data, userProfile);
      showToast(t("taskCreatedSuccess"), "success");
      setIsGlobalCreateTaskOpen(false);
    } catch (err: any) {
      console.error("Create task error:", err);
      showToast(err.message || t("authError"), "error");
    }
  };

  const activeSettingsProject = settingsProject
    ? projects.find((p) => p.id === settingsProject.id) || settingsProject
    : null;

  const activeSettingsMembers = React.useMemo(() => {
    if (!activeSettingsProject || !userProfile) return [];
    const list: ProjectMemberInfo[] = [];
    activeSettingsProject.memberIds.forEach((uid) => {
      const info = activeSettingsProject.members?.[uid];
      list.push({
        uid,
        email: info?.email || (uid === activeSettingsProject.ownerId ? userProfile.email : ""),
        displayName:
          info?.displayName ||
          (uid === activeSettingsProject.ownerId ? userProfile.displayName : "Member"),
        role: uid === activeSettingsProject.ownerId ? "owner" : "member",
      });
    });
    return list;
  }, [activeSettingsProject, userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t("loading")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Sidebar for Authenticated Users */}
      {currentUser && userProfile && (
        <Sidebar
          currentView={currentView}
          selectedProjectId={selectedProjectId}
          projects={projects}
          allTasksMap={allTasksMap}
          currentUser={userProfile}
          isOpenMobile={isMobileSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onNavigate={(view) => {
            setIsProjectSettingsRoute(false);
            setCurrentView(view);
            setSelectedProjectId(null);
            if (view === "dashboard") {
              setDashboardTaskFilter("all");
            }
          }}
          onSelectProject={handleOpenProject}
          onCreateProject={() => setIsCreateProjectModalOpen(true)}
          onSelectOverdueTasks={() => {
            setCurrentView("dashboard");
            setSelectedProjectId(null);
            setDashboardTaskFilter("overdue");
          }}
          isOverdueActive={currentView === "dashboard" && dashboardTaskFilter === "overdue"}
        />
      )}

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentView={currentView}
          projectName={selectedProject?.name}
          projects={projects}
          selectedProjectId={selectedProjectId}
          isSidebarOpen={!isSidebarCollapsed || isMobileSidebarOpen}
          onNavigate={(view) => {
            setIsProjectSettingsRoute(false);
            setCurrentView(view);
            setSelectedProjectId(null);
          }}
          onSelectProject={handleOpenProject}
          onCreateTask={() => {
            if (projects.length === 0) {
              showToast(t("noEligibleProjects"), "info");
              setIsCreateProjectModalOpen(true);
            } else {
              setIsGlobalCreateTaskOpen(true);
            }
          }}
          onCreateProject={() => setIsCreateProjectModalOpen(true)}
          onToggleSidebar={() => {
            if (window.innerWidth < 768) {
              setIsMobileSidebarOpen(!isMobileSidebarOpen);
            } else {
              setIsSidebarCollapsed(!isSidebarCollapsed);
            }
          }}
        />

        <FirestoreRulesBanner />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {!currentUser || !userProfile ? (
            <AuthScreen
              initialMode={authRouteMode || "login"}
              onModeChange={(mode) => setAuthRouteMode(mode)}
            />
          ) : currentView === "project-detail" ? selectedProject ? (
            <ProjectDetailView
              project={selectedProject}
              tasks={allTasksMap[selectedProject.id] || []}
              activities={currentProjectActivities}
              currentUser={userProfile}
              onBackToDashboard={() => {
                setCurrentView("dashboard");
                setSelectedProjectId(null);
              }}
              onProjectDeleted={() => {
                if (selectedProject?.id) {
                  const deletedId = selectedProject.id;
                  setAllTasksMap((prev) => {
                    const next = { ...prev };
                    delete next[deletedId];
                    return next;
                  });
                }
                setCurrentView("dashboard");
                setSelectedProjectId(null);
              }}
              onRefreshActivities={() => fetchActivities(selectedProject.id)}
              initialSettingsOpen={isProjectSettingsRoute}
              onSettingsRouteChange={setIsProjectSettingsRoute}
            />
          ) : projectsLoaded ? (
            <div className="max-w-xl mx-auto mt-16 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("projectUnavailable")}</h2>
            </div>
          ) : (
            <div className="min-h-64 flex items-center justify-center text-sm text-slate-500">{t("loading")}</div>
          ) : currentView === "projects" ? (
            <ProjectsListView
              projects={projects}
              allTasksMap={allTasksMap}
              currentUser={userProfile}
              onOpenProject={handleOpenProject}
              onCreateProject={() => setIsCreateProjectModalOpen(true)}
            />
          ) : currentView === "my-tasks" ? (
            <MyTasksView
              projects={projects}
              allTasksMap={allTasksMap}
              currentUser={userProfile}
              onOpenProject={handleOpenProject}
            />
          ) : (
            <DashboardOverview
              projects={projects}
              allTasksMap={allTasksMap}
              currentUser={userProfile}
              initialTaskFilter={dashboardTaskFilter}
              onOpenProject={handleOpenProject}
              onCreateProject={() => setIsCreateProjectModalOpen(true)}
              onCreateTaskGlobal={() => {
                if (projects.length === 0) {
                  showToast(t("noEligibleProjects"), "info");
                  setIsCreateProjectModalOpen(true);
                } else {
                  setIsGlobalCreateTaskOpen(true);
                }
              }}
              onNavigateToProjects={() => setCurrentView("projects")}
              onNavigateToMyTasks={() => setCurrentView("my-tasks")}
            />
          )}
        </main>
      </div>

      {/* Global Project Create Modal */}
      {userProfile && (
        <ProjectModal
          isOpen={isCreateProjectModalOpen}
          onClose={() => setIsCreateProjectModalOpen(false)}
          onSubmit={handleCreateProjectSubmit}
        />
      )}

      {/* Post-Creation Onboarding Modal */}
      {onboardingProject && (
        <ProjectOnboardingModal
          isOpen={!!onboardingProject}
          project={onboardingProject}
          onClose={() => setOnboardingProject(null)}
          onAddMembers={() => {
            setSettingsInitialTab("members");
            setSettingsProject(onboardingProject);
            setOnboardingProject(null);
          }}
          onCreateTask={() => {
            setOnboardingProject(null);
            setIsGlobalCreateTaskOpen(true);
          }}
          onOpenSettings={() => {
            setSettingsInitialTab("general");
            setSettingsProject(onboardingProject);
            setOnboardingProject(null);
          }}
          onContinueToProject={() => {
            setSelectedProjectId(onboardingProject.id);
            setCurrentView("project-detail");
            setOnboardingProject(null);
          }}
        />
      )}

      {/* Global Task Create Modal (from Dashboard Quick Actions) */}
      {userProfile && isGlobalCreateTaskOpen && (
        <TaskModal
          isOpen={isGlobalCreateTaskOpen}
          onClose={() => setIsGlobalCreateTaskOpen(false)}
          onSubmit={handleGlobalCreateTask}
          projects={projects}
          selectedProjectId={selectedProjectId || undefined}
          currentUser={userProfile}
        />
      )}

      {/* Settings Modal triggered from Onboarding */}
      {userProfile && activeSettingsProject && (
        <ProjectSettingsModal
          isOpen={!!activeSettingsProject}
          onClose={() => {
            setSettingsProject(null);
            if (selectedProjectId) {
              setCurrentView("project-detail");
            }
          }}
          project={activeSettingsProject}
          members={activeSettingsMembers}
          currentUser={userProfile}
          initialTab={settingsInitialTab}
          onUpdateProject={async (name, desc) => {
            await updateProject(activeSettingsProject.id, name, desc, userProfile, activeSettingsProject.version);
            showToast(t("projectUpdatedSuccess"), "success");
            const fresh = await getProject(activeSettingsProject.id);
            if (fresh) setSettingsProject(fresh);
          }}
          onAddMember={async (email) => {
            try {
              const added = await addProjectMember(activeSettingsProject.id, email, userProfile);
              showToast(t("memberAddedSuccess"), "success");
              const fresh = await getProject(activeSettingsProject.id);
              if (fresh) setSettingsProject(fresh);
              return added;
            } catch (err: any) {
              let msg = err.message || t("authError");
              if (err.message === "userNotFound") msg = t("userNotFound");
              if (err.message === "alreadyMember") msg = t("alreadyMember");
              showToast(msg, "error");
              throw err;
            }
          }}
          onRemoveMember={async (memberId) => {
            await removeProjectMember(activeSettingsProject.id, memberId, userProfile);
            showToast(t("memberRemovedSuccess"), "success");
            const fresh = await getProject(activeSettingsProject.id);
            if (fresh) setSettingsProject(fresh);
          }}
          onDeleteProject={async () => {
            await deleteProject(activeSettingsProject.id, userProfile);
            showToast(t("projectDeletedSuccess"), "success");
            setSettingsProject(null);
            setCurrentView("dashboard");
            setSelectedProjectId(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <MainApp />
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
