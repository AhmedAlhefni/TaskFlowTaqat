import React, { useState, useMemo } from "react";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  FolderKanban,
  ArrowRight,
  ArrowLeft,
  Calendar,
  CalendarDays,
  GanttChart,
  List,
  User,
  Sparkles,
} from "lucide-react";
import { Project, Task, TaskPriority, TaskStatus, UserProfile } from "@/src/types";
import { isTaskOverdue, formatDate } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";
import { useToast } from "@/src/components/common/Toast";
import { updateTaskStatus } from "@/src/services/taskService";
import { TaskCalendarView } from "@/src/components/tasks/TaskCalendarView";
import { TaskGanttView } from "@/src/components/tasks/TaskGanttView";

interface MyTasksViewProps {
  projects: Project[];
  allTasksMap: Record<string, Task[]>;
  currentUser: UserProfile;
  onOpenProject: (project: Project) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({
  projects,
  allTasksMap,
  currentUser,
  onOpenProject,
}) => {
  const { t, direction, language } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [isOverdueOnly, setIsOverdueOnly] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<"list" | "calendar" | "gantt">("list");

  // Map project ID to Project object
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Aggregate all tasks assigned to currentUser across all accessible active projects
  const myTasks = useMemo(() => {
    if (projects.length === 0) return [];
    const list: Task[] = [];
    Object.entries(allTasksMap).forEach(([projId, tasks]) => {
      if (!projectMap.has(projId)) return;
      tasks.forEach((t) => {
        if (t.assigneeId === currentUser.uid) {
          list.push(t);
        }
      });
    });
    return list;
  }, [allTasksMap, currentUser.uid, projectMap, projects.length]);

  // KPIs
  const totalAssigned = myTasks.length;
  const inProgressCount = myTasks.filter((t) => t.status === "in_progress").length;
  const doneCount = myTasks.filter((t) => t.status === "done").length;
  const overdueCount = myTasks.filter((t) => isTaskOverdue(t)).length;
  const completionRate = totalAssigned > 0 ? Math.round((doneCount / totalAssigned) * 100) : 0;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return myTasks
      .filter((task) => {
        if (selectedProjectId !== "all" && task.projectId !== selectedProjectId) {
          return false;
        }
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchDesc = (task.description || "").toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }
        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }
        if (priorityFilter !== "all" && task.priority !== priorityFilter) {
          return false;
        }
        if (isOverdueOnly && !isTaskOverdue(task)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Overdue first, then by due date
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return 0;
      });
  }, [myTasks, selectedProjectId, searchQuery, statusFilter, priorityFilter, isOverdueOnly]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(task.projectId, task.id, newStatus, currentUser, task.version);
      showToast(t("statusUpdatedSuccess"), "success");
    } catch (err: any) {
      console.error("Status update error:", err);
      let msg = err.message || t("authError");
      if (err.code === "CONCURRENCY_CONFLICT" || err.message?.includes("CONCURRENCY_CONFLICT")) {
        msg = t("concurrencyConflictTask");
      } else if (err.message === "notAuthorizedToChangeStatus") {
        msg = t("notAuthorizedToChangeStatus");
      }
      showToast(msg, "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-indigo-950/20 border border-indigo-800/40">
        <div className="absolute -end-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold mb-3 border border-white/10">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{t("myTasks")}</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t("myTasksTitle")}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              {t("myTasksSubtitle")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
              <div className="text-end">
                <span className="block text-[11px] text-indigo-200 font-semibold">{t("completionRate")}</span>
                <span className="text-2xl font-black text-white">{completionRate}%</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assigned */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">{t("totalTasks")}</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">{totalAssigned}</span>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{t("tasksInProgress")}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">{inProgressCount}</span>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{t("tasksDone")}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">{doneCount}</span>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">{t("overdueTasks")}</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <span className={`text-3xl font-black ${overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
            {overdueCount}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full ps-10 pe-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-600"
            />
          </div>

          {/* Project Filter */}
          <div className="w-full md:w-56">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">{language === "ar" ? "كل المشاريع" : "All Projects"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">{t("filterStatus")}: {t("all")}</option>
              <option value="todo">{t("todo")}</option>
              <option value="in_progress">{t("in_progress")}</option>
              <option value="done">{t("done")}</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="w-full md:w-40">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">{t("filterPriority")}: {t("all")}</option>
              <option value="high">{t("high")}</option>
              <option value="medium">{t("medium")}</option>
              <option value="low">{t("low")}</option>
            </select>
          </div>

          {/* Overdue Only toggle */}
          <button
            onClick={() => setIsOverdueOnly(!isOverdueOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
              isOverdueOnly
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t("filterOverdue")}</span>
          </button>
        </div>

        {/* View Mode Switcher Toolbar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="text-xs text-slate-500 font-semibold">
            <span>{filteredTasks.length} {language === "ar" ? "مهام متطابقة" : "matching tasks"}</span>
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setActiveViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeViewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{t("taskTable")}</span>
            </button>

            <button
              onClick={() => setActiveViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeViewMode === "calendar"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{t("calendarView")}</span>
            </button>

            <button
              onClick={() => setActiveViewMode("gantt")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeViewMode === "gantt"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <GanttChart className="w-3.5 h-3.5" />
              <span>{t("timelineView")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Display */}
      {activeViewMode === "calendar" ? (
        <TaskCalendarView
          tasks={filteredTasks}
          isOwner={false}
          currentUser={currentUser}
          onEditTask={(task) => {
            const p = projectMap.get(task.projectId);
            if (p) onOpenProject(p);
          }}
          onStatusChange={handleStatusChange}
        />
      ) : activeViewMode === "gantt" ? (
        <TaskGanttView
          tasks={filteredTasks}
          isOwner={false}
          currentUser={currentUser}
          onEditTask={(task) => {
            const p = projectMap.get(task.projectId);
            if (p) onOpenProject(p);
          }}
          onStatusChange={handleStatusChange}
        />
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            {myTasks.length === 0 ? t("noAssignedTasksYet") : t("noTasksFound")}
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {myTasks.length === 0
              ? (language === "ar" ? "عندما يقوم مديرو المشاريع بإسناد مهام إليك ستظهر هنا مباشرة." : "Tasks assigned to you will automatically show up here.")
              : t("resetFilters")}
          </p>
          {(searchQuery || statusFilter !== "all" || priorityFilter !== "all" || isOverdueOnly || selectedProjectId !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setIsOverdueOnly(false);
                setSelectedProjectId("all");
              }}
              className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              {t("resetFilters")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const overdue = isTaskOverdue(task);
            const parentProject = projectMap.get(task.projectId);

            return (
              <div
                key={task.id}
                className="group bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Status Toggle Quick Button */}
                  <button
                    onClick={() => handleStatusChange(task, task.status === "done" ? "in_progress" : "done")}
                    className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      task.status === "done"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 dark:border-slate-600 hover:border-indigo-600 text-transparent hover:text-slate-300"
                    }`}
                    title={task.status === "done" ? "Mark incomplete" : "Mark done"}
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold truncate ${task.status === "done" ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                        {task.title}
                      </h4>
                      {overdue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                          {language === "ar" ? "متأخرة" : "Overdue"}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {parentProject && (
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                          <FolderKanban className="w-3 h-3" />
                          <span>{parentProject.name}</span>
                        </span>
                      )}

                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${overdue ? "text-rose-600 font-bold" : ""}`}>
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(task.dueDate, language)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right / End controls */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="todo">{t("todo")}</option>
                    <option value="in_progress">{t("in_progress")}</option>
                    <option value="done">{t("done")}</option>
                  </select>

                  {/* Priority Badge */}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                      task.priority === "high"
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900"
                        : task.priority === "medium"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900"
                        : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {t(task.priority)}
                  </span>

                  {/* Go to Project Button */}
                  {parentProject && (
                    <button
                      onClick={() => onOpenProject(parentProject)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                      title={t("openInProject")}
                    >
                      {direction === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
