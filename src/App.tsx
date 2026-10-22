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
import { readAppRoute, useAppRouting } from "@/src/hooks/useAppRouting";
import { useWorkspaceData } from "@/src/hooks/useWorkspaceData";
import {
  createProject,
  getProject,
  updateProject,
  addProjectMember,
  removeProjectMember,
  deleteProject,
} from "@/src/services/projectService";
import { createTask } from "@/src/services/taskService";
import { getProjectActivities } from "@/src/services/activityService";
import { FirestoreRulesBanner } from "@/src/components/common/FirestoreRulesBanner";
import { NotFoundPage } from "@/src/components/common/NotFoundPage";

function MainApp() {
  const { currentUser, userProfile, loading } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const initialRoute = React.useMemo(() => readAppRoute(), []);
  const [authRouteMode, setAuthRouteMode] = useState<"login" | "register" | null>(initialRoute.authMode);

  const [currentView, setCurrentView] = useState<"dashboard" | "projects" | "project-detail" | "my-tasks" | "not-found">(
    initialRoute.view
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialRoute.projectId);
  const [isProjectSettingsRoute, setIsProjectSettingsRoute] = useState(initialRoute.settings);
  const { projects, projectsLoaded, allTasksMap, setAllTasksMap, loadFailed } = useWorkspaceData(currentUser?.uid || null, loading);

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

  useAppRouting({
    currentView,
    setCurrentView,
    selectedProjectId,
    setSelectedProjectId,
    createProjectOpen: isCreateProjectModalOpen,
    setCreateProjectOpen: setIsCreateProjectModalOpen,
    projectSettingsRoute: isProjectSettingsRoute,
    setProjectSettingsRoute: setIsProjectSettingsRoute,
    authRouteMode,
    setAuthRouteMode,
    isAuthenticated: Boolean(currentUser),
    authLoading: loading,
  });

  // Reset transient screen state when authentication changes.
  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      setDashboardTaskFilter("all");
      setCurrentProjectActivities([]);
      setIsGlobalCreateTaskOpen(false);
      setOnboardingProject(null);
      setSettingsProject(null);
      setIsMobileSidebarOpen(false);
      return;
    }

    // Only reset to dashboard if a DIFFERENT user account just signed in
    const lastAuthUser = localStorage.getItem("taskflow_last_auth_user");
    if (lastAuthUser && lastAuthUser !== currentUser.uid) {
      setCurrentView("dashboard");
      setSelectedProjectId(null);
      setCurrentProjectActivities([]);
      setIsCreateProjectModalOpen(false);
      setIsGlobalCreateTaskOpen(false);
      setOnboardingProject(null);
      setSettingsProject(null);
    }
    localStorage.setItem("taskflow_last_auth_user", currentUser.uid);

  }, [currentUser, loading]);

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
    setCurrentProjectActivities([]);
    const hasProjectAccess = Boolean(currentUser && projects.some((project) => project.id === selectedProjectId));
    if (!selectedProjectId || !hasProjectAccess) return;

    let isCurrentProject = true;
    getProjectActivities(selectedProjectId)
      .then((activities) => {
        if (isCurrentProject) setCurrentProjectActivities(activities);
      })
      .catch((error) => console.error("Failed to load activities:", error));

    return () => {
      isCurrentProject = false;
    };
  }, [selectedProjectId, currentUser, projects]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;

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

  if (loading || (currentUser && !projectsLoaded && !loadFailed)) {
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
          currentView={currentView === "not-found" ? "dashboard" : currentView}
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
          currentView={currentView === "not-found" ? "dashboard" : currentView}
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
          ) : currentView === "not-found" ? (
            <NotFoundPage
              onGoToDashboard={() => {
                setIsProjectSettingsRoute(false);
                setIsCreateProjectModalOpen(false);
                setSelectedProjectId(null);
                setCurrentView("dashboard");
              }}
            />
          ) : loadFailed ? (
            <section role="alert" className="max-w-xl mx-auto mt-16 rounded-2xl border border-amber-300 bg-white dark:bg-slate-900 p-8 text-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === "ar" ? "تعذر تأكيد صلاحية الوصول" : "Could not confirm project access"}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {language === "ar"
                  ? "لم نعرض البيانات المحفوظة محليًا. تحقق من الاتصال وقواعد Firestore ثم أعد المحاولة."
                  : "Cached project data is hidden until Firestore confirms access. Check your connection and rules, then retry."}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                {language === "ar" ? "إعادة المحاولة" : "Retry"}
              </button>
            </section>
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
