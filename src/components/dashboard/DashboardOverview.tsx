import React, { useState, useMemo, useEffect } from "react";
import {
  FolderKanban,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Users,
  Activity as ActivityIcon,
  Crown,
  UserCheck,
  ListTodo,
  Calendar,
  Sparkles,
  Layers,
  Check,
  Search,
  Filter,
  Flame,
  ShieldCheck,
  BarChart3,
  ExternalLink,
  LayoutGrid,
} from "lucide-react";
import { Project, Task, UserProfile } from "@/src/types";
import { isTaskOverdue, formatDate } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";
import { ProjectCard } from "@/src/components/projects/ProjectCard";
import { useDashboardData } from "@/src/hooks/useDashboardData";
import type { DashboardTaskFilter } from "@/src/hooks/useDashboardData";
import { DashboardTaskFeed } from "@/src/components/dashboard/DashboardTaskFeed";

interface DashboardOverviewProps {
  projects: Project[];
  allTasksMap: Record<string, Task[]>;
  currentUser: UserProfile;
  initialTaskFilter?: "all" | "my" | "in_progress" | "done" | "todo" | "overdue";
  onOpenProject: (project: Project) => void;
  onCreateProject: () => void;
  onCreateTaskGlobal: () => void;
  onNavigateToProjects: () => void;
  onNavigateToMyTasks: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  projects,
  allTasksMap,
  currentUser,
  initialTaskFilter = "all",
  onOpenProject,
  onCreateProject,
  onCreateTaskGlobal,
  onNavigateToProjects,
  onNavigateToMyTasks,
}) => {
  const { t, direction, language } = useLanguage();

  // Role filter for projects grid
  const [projectRoleFilter, setProjectRoleFilter] = useState<"all" | "owned" | "member">("all");

  // Interactive Task filtering state on the dashboard
  const [taskFilter, setTaskFilter] = useState<DashboardTaskFilter>(initialTaskFilter);
  const [taskSearch, setTaskSearch] = useState<string>("");

  useEffect(() => {
    if (initialTaskFilter) {
      setTaskFilter(initialTaskFilter);
      if (initialTaskFilter === "overdue") {
        setTimeout(() => {
          const el = document.getElementById("interactive-tasks-section");
          el?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, [initialTaskFilter]);

  const totalProjects = projects.length;
  const {
    ownedProjects, memberOnlyProjects, visibleProjects, totalTasks,
    todoTasks, inProgressTasks, doneTasks, overdueTasks,
    highPriorityTasks, mediumPriorityTasks, lowPriorityTasks,
    myAssignedTasks, myPendingTasks, overallProgress, inProgressPercent,
    todoPercent, projectMap, displayTasks,
  } = useDashboardData(projects, allTasksMap, currentUser.uid, taskFilter, taskSearch, projectRoleFilter);

  // Contextual summary for welcome banner
  const contextualSummary = useMemo(() => {
    if (projects.length === 0) {
      return language === "ar"
        ? "ابدأ بتنظيم مشاريعك ومهام فريقك في منصة متكاملة وسلسة."
        : "Start organizing your projects and team tasks in a seamless workspace.";
    }
    if (language === "ar") {
      return `لديك ${myPendingTasks.length} مهمة بانتظار إنجازك من أصل ${totalTasks} مهمة عبر ${totalProjects} مساحة عمل نشطة.`;
    }
    return `You have ${myPendingTasks.length} active tasks waiting for you out of ${totalTasks} total tasks across ${totalProjects} workspaces.`;
  }, [projects.length, myPendingTasks.length, totalTasks, totalProjects, language]);

  // SVG circular gauge math
  const gaugeRadius = 26;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (overallProgress / 100) * gaugeCircumference;

  // If new user with 0 projects: show clear, high-quality Onboarding State
  if (projects.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Welcome Hero */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 p-8 sm:p-12 rounded-3xl text-white shadow-xl shadow-indigo-950/20 border border-indigo-800/40">
          <div className="absolute -end-10 -bottom-10 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold mb-4 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>{t("appName")}</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {t("welcomeBack")}, {currentUser.displayName || currentUser.email.split("@")[0]}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-indigo-100/90 leading-relaxed">
              {t("emptyDashboardSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onCreateProject}
                className="px-6 py-3.5 rounded-2xl bg-white text-indigo-950 hover:bg-indigo-50 font-black text-sm shadow-xl shadow-black/20 flex items-center gap-2.5 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>{t("createFirstProject")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Steps Onboarding Guide Cards */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {language === "ar" ? "كيف تبدأ العمل في خطوات بسيطة:" : "How to get started in 3 simple steps:"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg mb-4">
                  1
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {t("emptyStep1Title")}
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("emptyStep1Desc")}
                </p>
              </div>
              <button
                onClick={onCreateProject}
                className="mt-6 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <span>{t("newProject")}</span>
                {direction === "rtl" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg mb-4">
                  2
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {t("emptyStep2Title")}
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("emptyStep2Desc")}
                </p>
              </div>
              <span className="mt-6 text-[11px] text-slate-400">
                {language === "ar" ? "متاح في إعدادات المشروع" : "Available in Project Settings"}
              </span>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black text-lg mb-4">
                  3
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {t("emptyStep3Title")}
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("emptyStep3Desc")}
                </p>
              </div>
              <span className="mt-6 text-[11px] text-slate-400">
                {language === "ar" ? "سحب وإفلات وتحديث فوري" : "Drag-and-drop & live sync"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Workspace Banner with Personalized Greeting */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-indigo-950/20 border border-indigo-800/40">
        <div className="absolute -end-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute end-44 -top-20 w-48 h-48 rounded-full bg-indigo-500/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold mb-3 border border-white/15 shadow-inner">
              <div className="w-4 h-4 rounded-md bg-indigo-500/80 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-2.5 h-2.5 text-white" />
              </div>
              <span>{t("overviewTitle")}</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t("welcomeBack")}, {currentUser.displayName || currentUser.email.split("@")[0]}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              {contextualSummary}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCreateProject}
              className="px-5 py-3 rounded-2xl bg-white text-indigo-950 hover:bg-indigo-50 font-extrabold text-xs sm:text-sm shadow-lg shadow-black/15 flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t("newProject")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Immediate Overdue Tasks Focus Alert Section (Visible when filtering overdue) */}
      {taskFilter === "overdue" && (
        <div className="bg-rose-50 dark:bg-rose-950/40 rounded-3xl p-6 border-2 border-rose-300 dark:border-rose-900/80 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/30">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-rose-950 dark:text-rose-100 flex items-center gap-2">
                  <span>{language === "ar" ? "المهام المتأخرة عن موعدها" : "Overdue Tasks"}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono">
                    {overdueTasks.length}
                  </span>
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  {language === "ar"
                    ? "هذه المهام تجاوزت موعد تسليمها وتحتاج إلى متابعة سريعة."
                    : "These tasks have passed their due date and require immediate attention."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTaskFilter("all")}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              {language === "ar" ? "عرض كل المهام" : "View All Tasks"}
            </button>
          </div>

          {/* Overdue Tasks List */}
          {overdueTasks.length === 0 ? (
            <div className="text-center py-6 bg-white/60 dark:bg-slate-900/40 rounded-2xl text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {t("noOverdueTasks")}
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdueTasks.map((task) => {
                const parentProject = projectMap.get(task.projectId);
                return (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs flex items-center justify-between gap-3 hover:border-rose-400 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {task.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            {language === "ar" ? "متأخرة" : "Overdue"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {parentProject && (
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {parentProject.name}
                            </span>
                          )}
                          {task.dueDate && <span>• {formatDate(task.dueDate, language)}</span>}
                          {task.assigneeName && <span>• {task.assigneeName}</span>}
                        </div>
                      </div>
                    </div>

                    {parentProject && (
                      <button
                        type="button"
                        onClick={() => onOpenProject(parentProject)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <span>{t("openInProject")}</span>
                        {direction === "rtl" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Prominent Quick Actions Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              {t("quickActions")}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Action 1: Create Project */}
          <button
            onClick={onCreateProject}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-start transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {t("newProject")}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                {language === "ar" ? "إنشاء مساحة عمل جديدة" : "New workspace"}
              </span>
            </div>
          </button>

          {/* Action 2: Create Task */}
          <button
            onClick={onCreateTaskGlobal}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-start transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {t("createNewTask")}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                {language === "ar" ? "إضافة مهمة سريعة" : "Add to project"}
              </span>
            </div>
          </button>

          {/* Action 3: My Tasks */}
          <button
            onClick={onNavigateToMyTasks}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 text-start transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {t("myTasks")}
                </span>
                {myAssignedTasks.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 rounded-full">
                    {myAssignedTasks.length}
                  </span>
                )}
              </div>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                {language === "ar" ? "المهام المعينة لك" : "Assigned to me"}
              </span>
            </div>
          </button>

          {/* Action 4: Browse Projects */}
          <button
            onClick={onNavigateToProjects}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-start transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {t("browseProjects")}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                {projects.length} {language === "ar" ? "مساحة عمل" : "accessible"}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. KPI Statistics Cards (Pure Statistical & Informational Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Overall Completion Rate with Circular SVG Gauge */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              {t("completionRate")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {overallProgress}%
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {doneTasks.length} {language === "ar" ? "من" : "of"} {totalTasks} {language === "ar" ? "مكتملة" : "done"}
              </p>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r={gaugeRadius}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="30"
                  cy="30"
                  r={gaugeRadius}
                  className="stroke-emerald-500 transition-all duration-700 ease-out"
                  strokeWidth="6"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeOffset}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                {overallProgress}%
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
            {overallProgress === 100
              ? (language === "ar" ? "إنجاز كامل 100%" : "All Completed!")
              : overallProgress > 50
              ? (language === "ar" ? "تقدم ممتاز ومستمر" : "Great momentum")
              : (language === "ar" ? "قيد التنفيذ والمتابعة" : "In Progress")}
          </div>
        </div>

        {/* Card 2: Total Projects & Role Distribution */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              {t("totalProjects")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {totalProjects}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {language === "ar" ? "مساحة" : "workspaces"}
              </span>
            </div>

            {/* Segmented Ownership Bar */}
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  style={{ width: `${totalProjects > 0 ? (ownedProjects.length / totalProjects) * 100 : 0}%` }}
                  className="bg-amber-500 transition-all duration-500"
                  title={`${language === "ar" ? "مالك" : "Owner"}: ${ownedProjects.length}`}
                />
                <div
                  style={{ width: `${totalProjects > 0 ? (memberOnlyProjects.length / totalProjects) * 100 : 0}%` }}
                  className="bg-blue-500 transition-all duration-500"
                  title={`Member: ${memberOnlyProjects.length}`}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Crown className="w-3 h-3" />
                  <span>{ownedProjects.length} {language === "ar" ? "مالك" : "Owner"}</span>
                </span>
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Users className="w-3 h-3" />
                  <span>{memberOnlyProjects.length} {language === "ar" ? "عضو" : "Member"}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
            {language === "ar" ? "إجمالي مساحات العمل النشطة" : "Total active workspaces"}
          </div>
        </div>

        {/* Card 3: In Progress Momentum */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              {t("tasksInProgress")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center relative">
              <Clock className="w-4 h-4" />
              {inProgressTasks.length > 0 && (
                <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              )}
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {inProgressTasks.length}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                {inProgressPercent}% {language === "ar" ? "من الإجمالي" : "of total"}
              </span>
            </div>

            {/* Visual ratio track vs todo */}
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  style={{ width: `${totalTasks > 0 ? (inProgressTasks.length / totalTasks) * 100 : 0}%` }}
                  className="bg-blue-500 transition-all duration-500"
                />
                <div
                  style={{ width: `${totalTasks > 0 ? (todoTasks.length / totalTasks) * 100 : 0}%` }}
                  className="bg-slate-300 dark:bg-slate-700 transition-all duration-500"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>{todoTasks.length} {t("tasksTodo")}</span>
                <span>{inProgressTasks.length} {language === "ar" ? "جارية الآن" : "Active"}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
            {language === "ar" ? "سرعة إنجاز وحركة مستمرة" : "Active tasks progress"}
          </div>
        </div>

        {/* Card 4: Assigned To Me Workload */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
              {t("tasksAssignedToMe")}
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {myAssignedTasks.length}
              </span>
              <span className="text-xs text-violet-600 dark:text-violet-400 font-bold">
                {myPendingTasks.length} {language === "ar" ? "قيد المتابعة" : "pending"}
              </span>
            </div>

            {/* Workload Progress Bar */}
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  style={{
                    width: `${myAssignedTasks.length > 0 ? ((myAssignedTasks.length - myPendingTasks.length) / myAssignedTasks.length) * 100 : 0}%`,
                  }}
                  className="bg-violet-500 transition-all duration-500"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>{myAssignedTasks.length - myPendingTasks.length} {language === "ar" ? "أنجزتها" : "done"}</span>
                <span>{myPendingTasks.length} {language === "ar" ? "متبقية" : "remaining"}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
            {language === "ar" ? "المسؤولية المباشرة والمتابعة" : "Personal workload"}
          </div>
        </div>

        {/* Card 5: Overdue Watchdog & Due Date Health */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
          overdueTasks.length > 0
            ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
              overdueTasks.length > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
            }`}>
              {t("overdueTasks")}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              overdueTasks.length > 0
                ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 animate-pulse"
                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
            }`}>
              {overdueTasks.length > 0 ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${
                overdueTasks.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
              }`}>
                {overdueTasks.length}
              </span>
              <span className={`text-xs font-bold ${
                overdueTasks.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {overdueTasks.length > 0 ? (language === "ar" ? "تحتاج تدخلاً" : "Urgent action") : (language === "ar" ? "منضبطة 100%" : "On schedule")}
              </span>
            </div>

            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  style={{ width: `${totalTasks > 0 ? (overdueTasks.length / totalTasks) * 100 : 0}%` }}
                  className="bg-rose-500 transition-all duration-500"
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 font-medium">
                {overdueTasks.length > 0
                  ? (language === "ar" ? "تجاوزت موعد التسليم المحدد" : "Passed their due deadline")
                  : (language === "ar" ? "لا توجد مهام متأخرة إطلاقاً" : "No overdue deadlines")}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
            {overdueTasks.length > 0 ? (language === "ar" ? "مخاطر المواعيد النهائية" : "Schedule risk") : (language === "ar" ? "حالة صحية ممتازة" : "Healthy pacing")}
          </div>
        </div>

        {/* Card 6: Priority Breakdown */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              {language === "ar" ? "مستويات الأولوية" : "Priority Mix"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {highPriorityTasks.length}
              </span>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                {language === "ar" ? "عالية الأهمية" : "high priority"}
              </span>
            </div>

            {/* Stacked Priority Bar */}
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  style={{ width: `${totalTasks > 0 ? (highPriorityTasks.length / totalTasks) * 100 : 0}%` }}
                  className="bg-rose-500 transition-all duration-500"
                  title={`High: ${highPriorityTasks.length}`}
                />
                <div
                  style={{ width: `${totalTasks > 0 ? (mediumPriorityTasks.length / totalTasks) * 100 : 0}%` }}
                  className="bg-amber-500 transition-all duration-500"
                  title={`Medium: ${mediumPriorityTasks.length}`}
                />
                <div
                  style={{ width: `${totalTasks > 0 ? (lowPriorityTasks.length / totalTasks) * 100 : 0}%` }}
                  className="bg-slate-400 transition-all duration-500"
                  title={`Low: ${lowPriorityTasks.length}`}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span className="text-rose-600 dark:text-rose-400">{highPriorityTasks.length} {t("high")}</span>
                <span className="text-amber-600 dark:text-amber-400">{mediumPriorityTasks.length} {t("medium")}</span>
                <span className="text-slate-500">{lowPriorityTasks.length} {t("low")}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
            {totalTasks} {t("totalTasks")}
          </div>
        </div>
      </div>

      {/* 4. Interactive Visual Analytics & Progress Distribution Bar ("تكتر من موضوع الاحصائيات والاشياء المرئية") */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {language === "ar" ? "شريط التقدم وحالة المهام التفاعلي" : "Interactive Workload Distribution Bar"}
              </h3>
              <p className="text-xs text-slate-400">
                {language === "ar" ? "اضغط على أي تصنيف لتصفية المهام المعروضة فوراً" : "Click any section or badge below to instantly filter the task list"}
              </p>
            </div>
          </div>

          {/* Search bar inside dashboard tasks */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder={language === "ar" ? "ابحث في كل المهام..." : "Search all tasks..."}
              className="w-full ps-9 pe-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Visual Segmented Distribution Bar */}
        <div>
          <div className="h-4 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
            <button
              type="button"
              onClick={() => setTaskFilter(taskFilter === "done" ? "all" : "done")}
              style={{ width: `${overallProgress}%` }}
              className="h-full bg-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer relative group/bar"
              title={`${doneTasks.length} Completed (${overallProgress}%)`}
            />
            <button
              type="button"
              onClick={() => setTaskFilter(taskFilter === "in_progress" ? "all" : "in_progress")}
              style={{ width: `${inProgressPercent}%` }}
              className="h-full bg-blue-500 hover:bg-blue-600 transition-all cursor-pointer relative group/bar"
              title={`${inProgressTasks.length} In Progress (${inProgressPercent}%)`}
            />
            <button
              type="button"
              onClick={() => setTaskFilter(taskFilter === "todo" ? "all" : "todo")}
              style={{ width: `${todoPercent}%` }}
              className="h-full bg-slate-400 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500 transition-all cursor-pointer relative group/bar"
              title={`${todoTasks.length} To Do (${todoPercent}%)`}
            />
          </div>

          {/* Interactive filter chips connected to the bar */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setTaskFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taskFilter === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>{language === "ar" ? "كل المهام" : "All Tasks"}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${taskFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700"}`}>
                {totalTasks}
              </span>
            </button>

            <button
              onClick={() => setTaskFilter("my")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taskFilter === "my"
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{t("myTasks")}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${taskFilter === "my" ? "bg-white/20 text-white" : "bg-violet-200/80 dark:bg-violet-900"}`}>
                {myAssignedTasks.length}
              </span>
            </button>

            <button
              onClick={() => setTaskFilter("in_progress")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taskFilter === "in_progress"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{t("tasksInProgress")}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${taskFilter === "in_progress" ? "bg-white/20 text-white" : "bg-blue-200/80 dark:bg-blue-900"}`}>
                {inProgressTasks.length}
              </span>
            </button>

            <button
              onClick={() => setTaskFilter("done")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taskFilter === "done"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t("tasksDone")}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${taskFilter === "done" ? "bg-white/20 text-white" : "bg-emerald-200/80 dark:bg-emerald-900"}`}>
                {doneTasks.length}
              </span>
            </button>

            <button
              onClick={() => setTaskFilter("todo")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taskFilter === "todo"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>{t("tasksTodo")}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${taskFilter === "todo" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700"}`}>
                {todoTasks.length}
              </span>
            </button>

            {overdueTasks.length > 0 && (
              <button
                onClick={() => setTaskFilter("overdue")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  taskFilter === "overdue"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{t("overdueTasks")}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${taskFilter === "overdue" ? "bg-white/20 text-white" : "bg-rose-200/80 dark:bg-rose-900"}`}>
                  {overdueTasks.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <DashboardTaskFeed
        taskFilter={taskFilter}
        displayTasks={displayTasks}
        myAssignedTasks={myAssignedTasks}
        projectMap={projectMap}
        currentUser={currentUser}
        onNavigateToMyTasks={onNavigateToMyTasks}
        onOpenProject={onOpenProject}
      />
      {/* 6. Active Workspaces Grid Section with Role Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("recentProjects")}
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              {visibleProjects.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                onClick={() => setProjectRoleFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  projectRoleFilter === "all"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {language === "ar" ? "الكل" : "All"} ({projects.length})
              </button>
              <button
                onClick={() => setProjectRoleFilter("owned")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  projectRoleFilter === "owned"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Crown className="w-3 h-3 text-amber-500" />
                <span>{language === "ar" ? "أملكها" : "Owned"}</span>
              </button>
              <button
                onClick={() => setProjectRoleFilter("member")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  projectRoleFilter === "member"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users className="w-3 h-3 text-blue-500" />
                <span>{language === "ar" ? "عضو" : "Member"}</span>
              </button>
            </div>

            <button
              onClick={onNavigateToProjects}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t("viewAllProjects")}</span>
              {direction === "rtl" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleProjects.slice(0, 6).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={allTasksMap[project.id] || []}
              currentUser={currentUser}
              onClick={onOpenProject}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
