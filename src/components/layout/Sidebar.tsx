import React, { useMemo } from "react";
import {
  LayoutGrid,
  FolderKanban,
  Kanban,
  AlertCircle,
  Plus,
  Folder,
  X,
  TrendingUp,
  CheckSquare,
  LogOut,
  FolderPlus,
} from "lucide-react";
import { Project, Task, UserProfile } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";
import { useAuth } from "@/src/context/AuthContext";
import { isTaskOverdue } from "@/src/lib/dateUtils";

interface SidebarProps {
  currentView: "dashboard" | "projects" | "project-detail" | "my-tasks";
  selectedProjectId: string | null;
  projects: Project[];
  allTasksMap: Record<string, Task[]>;
  currentUser: UserProfile;
  isOpenMobile: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNavigate: (view: "dashboard" | "projects" | "my-tasks") => void;
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
  onSelectOverdueTasks?: () => void;
  isOverdueActive?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  selectedProjectId,
  projects,
  allTasksMap,
  currentUser,
  isOpenMobile,
  isCollapsed,
  onCloseMobile,
  onNavigate,
  onSelectProject,
  onCreateProject,
  onSelectOverdueTasks,
  isOverdueActive = false,
}) => {
  const { t, language } = useLanguage();
  const { logout } = useAuth();

  // Aggregate stats for sidebar badges - strictly filtered to active projects only
  const activeProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const allTasks: Task[] = useMemo(() => {
    if (projects.length === 0) return [];
    return Object.entries(allTasksMap)
      .filter(([pId]) => activeProjectIds.has(pId))
      .flatMap(([, tasks]) => tasks);
  }, [allTasksMap, activeProjectIds, projects.length]);

  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.status === "done").length;
  const overdueCount = allTasks.filter((t) => isTaskOverdue(t)).length;
  const myTasksCount = allTasks.filter((t) => t.assigneeId === currentUser.uid).length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "User";
  const userInitials = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop Overlay - Single tap to close */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen bg-white dark:bg-slate-900 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none ${
          isOpenMobile
            ? "flex start-0 w-72 shadow-2xl opacity-100 border-e border-slate-200/90 dark:border-slate-800"
            : isCollapsed
            ? "hidden"
            : "hidden md:flex md:w-64 md:opacity-100 border-e border-slate-200/90 dark:border-slate-800"
        }`}
      >
        {/* Top: Brand, Quick Action & Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          {/* Header & Brand (Single clean close button ONLY on mobile drawer, none on desktop) */}
          <div className="h-14 sm:h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => {
                onNavigate("dashboard");
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 cursor-pointer text-start overflow-hidden group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Kanban className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                  TaskFlow
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t("activeWorkspace")}</span>
                </span>
              </div>
            </button>

            {/* Mobile Close Button (Visible strictly on mobile drawer) */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title={t("close")}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Create Project Primary Button */}
          <div className="p-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                onCreateProject();
                onCloseMobile();
              }}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <FolderPlus className="w-4 h-4 group-hover:scale-110 transition-transform duration-200 shrink-0" />
              <span>{t("newProject")}</span>
            </button>
          </div>

          {/* Main Navigation Section */}
          <div className="px-3 space-y-1">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {language === "ar" ? "التنقل الرئيسي" : "Main Navigation"}
            </div>

            {/* Dashboard Navigation with upgraded modern icon */}
            <button
              type="button"
              onClick={() => {
                onNavigate("dashboard");
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                currentView === "dashboard" && !isOverdueActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 shadow-2xs border-s-4 border-indigo-600"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    currentView === "dashboard" && !isOverdueActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <span>{t("dashboard")}</span>
              </div>
              {totalTasks > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {totalTasks}
                </span>
              )}
            </button>

            {/* Projects */}
            <button
              type="button"
              onClick={() => {
                onNavigate("projects");
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                currentView === "projects"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 shadow-2xs border-s-4 border-indigo-600"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    currentView === "projects"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  <FolderKanban className="w-4 h-4" />
                </div>
                <span>{t("projects")}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                {projects.length}
              </span>
            </button>

            {/* My Tasks */}
            <button
              type="button"
              onClick={() => {
                onNavigate("my-tasks");
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                currentView === "my-tasks"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 shadow-2xs border-s-4 border-indigo-600"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    currentView === "my-tasks"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span>{t("myTasks")}</span>
              </div>
              {myTasksCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold font-mono">
                  {myTasksCount}
                </span>
              )}
            </button>

            {/* Overdue Tasks Alert Item (Fully functional active filter with high-visibility feedback) */}
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (onSelectOverdueTasks) {
                    onSelectOverdueTasks();
                  } else {
                    onNavigate("dashboard");
                  }
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isOverdueActive
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/25 border-s-4 border-rose-800"
                    : "bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60"
                }`}
                title={language === "ar" ? "عرض المهام المتأخرة مباشرة" : "View overdue tasks directly"}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isOverdueActive ? "bg-white/20 text-white" : "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <AlertCircle className={`w-4 h-4 ${!isOverdueActive ? "animate-pulse" : ""}`} />
                  </div>
                  <span>{t("overdueTasks")}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                    isOverdueActive
                      ? "bg-white text-rose-700 shadow-xs"
                      : "bg-rose-600 text-white animate-pulse"
                  }`}
                >
                  {overdueCount}
                </span>
              </button>
            )}
          </div>

          {/* Pinned / Direct Projects Section */}
          <div className="px-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t("pinnedProjects")} ({projects.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  onCreateProject();
                  onCloseMobile();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={t("newProject")}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <div className="text-center py-4 px-2 text-[11px] text-slate-400">
                  {t("noProjectsYet")}
                </div>
              ) : (
                projects.map((p) => {
                  const isCurrent = currentView === "project-detail" && selectedProjectId === p.id;
                  const pTasks = allTasksMap[p.id] || [];
                  const pOverdue = pTasks.some((t) => isTaskOverdue(t));
                  const isOwner = p.ownerId === currentUser.uid;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectProject(p);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer truncate ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isCurrent
                              ? "text-white"
                              : isOwner
                              ? "text-amber-500"
                              : "text-indigo-500"
                          }`}
                        />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isOwner && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                              isCurrent
                                ? "bg-white/20 text-white"
                                : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {language === "ar" ? "مالك" : "Owner"}
                          </span>
                        )}
                        {pOverdue && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Workspace Health Gauge & User Profile */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Completion Progress Widget */}
          {totalTasks > 0 && (
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t("overallHealth")}</span>
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                  {completionRate}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-medium">
                <span>
                  {doneTasks} {t("tasksDone")}
                </span>
                <span>
                  {totalTasks} {t("totalTasks")}
                </span>
              </div>
            </div>
          )}

          {/* User Account Bar */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
            <div className="flex items-center gap-2.5 truncate">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{userInitials}</span>
                )}
                <span className="absolute bottom-0 end-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
              </div>
              <div className="flex flex-col truncate text-start">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {currentUser.email || ""}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title={t("logout")}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
