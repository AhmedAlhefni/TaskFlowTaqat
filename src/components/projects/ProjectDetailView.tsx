import React, { useState, useEffect, useMemo } from "react";
import {
  FolderKanban,
  Kanban,
  List,
  CalendarDays,
  GanttChart,
  History,
  Settings,
  Plus,
  Shield,
  Users,
  User,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  Project,
  Task,
  TaskFilters,
  TaskStatus,
  ProjectMemberInfo,
  UserProfile,
  Activity,
} from "@/src/types";
import { isTaskOverdue } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";
import { useToast } from "@/src/components/common/Toast";
import { KanbanBoard } from "@/src/components/tasks/KanbanBoard";
import { TaskTable } from "@/src/components/tasks/TaskTable";
import { TaskCalendarView } from "@/src/components/tasks/TaskCalendarView";
import { TaskGanttView } from "@/src/components/tasks/TaskGanttView";
import { TaskFiltersBar } from "@/src/components/tasks/TaskFiltersBar";
import { TaskModal } from "@/src/components/tasks/TaskModal";
import { ProjectSettingsModal } from "@/src/components/projects/ProjectSettingsModal";
import { ProjectMembersModal } from "@/src/components/projects/ProjectMembersModal";
import { ProjectMembersTab } from "@/src/components/projects/ProjectMembersTab";
import { ActivityTimeline } from "@/src/components/activity/ActivityTimeline";
import { ConfirmationModal } from "@/src/components/common/ConfirmationModal";
import {
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  subscribeProjectTasks,
} from "@/src/services/taskService";
import { localStore } from "@/src/services/localStore";
import {
  updateProject,
  addProjectMember,
  removeProjectMember,
  deleteProject,
} from "@/src/services/projectService";

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  activities: Activity[];
  currentUser: UserProfile;
  onBackToDashboard: () => void;
  onProjectDeleted: () => void;
  onRefreshActivities?: () => void;
  initialSettingsOpen?: boolean;
  onSettingsRouteChange?: (open: boolean) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  tasks,
  activities,
  currentUser,
  onBackToDashboard,
  onProjectDeleted,
  onRefreshActivities,
  initialSettingsOpen = false,
  onSettingsRouteChange,
}) => {
  const { t, direction, language } = useLanguage();
  const { showToast } = useToast();

  const isOwner = project.ownerId === currentUser.uid;

  // View state
  const [activeTab, setActiveTab] = useState<"kanban" | "table" | "calendar" | "gantt" | "members" | "activity">("kanban");

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnStatus, setDefaultColumnStatus] = useState<TaskStatus>("todo");
  const [defaultDueDate, setDefaultDueDate] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(initialSettingsOpen);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  useEffect(() => {
    setIsSettingsOpen(initialSettingsOpen);
  }, [initialSettingsOpen]);

  const setSettingsOpen = (open: boolean) => {
    setIsSettingsOpen(open);
    onSettingsRouteChange?.(open);
  };

  // Filters state
  const defaultFilters: TaskFilters = {
    searchQuery: "",
    status: "all",
    priority: "all",
    assigneeId: "all",
    isOverdueOnly: false,
    sortBy: "created_desc",
  };
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);

  // Dedicated resilient real-time project tasks state
  const [projectTasks, setProjectTasks] = useState<Task[]>(() => {
    if (tasks && tasks.length > 0) return tasks;
    return localStore.getTasks(project.id);
  });

  // Keep synced with incoming tasks prop if provided
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      setProjectTasks(tasks);
    }
  }, [tasks]);

  // Dedicated real-time subscription for this project
  useEffect(() => {
    const unsubscribe = subscribeProjectTasks(project.id, (freshTasks) => {
      setProjectTasks(freshTasks);
    });
    return () => unsubscribe();
  }, [project.id]);

  // Compute members list with roles
  const projectMembers: ProjectMemberInfo[] = useMemo(() => {
    const list: ProjectMemberInfo[] = [];
    const membersMap = project.members || {};

    project.memberIds.forEach((uid) => {
      const info = membersMap[uid] || {
        email: uid === project.ownerId ? currentUser.email : "user@example.com",
        displayName: uid === project.ownerId ? currentUser.displayName : "Member",
      };
      list.push({
        uid,
        email: info.email,
        displayName: info.displayName || info.email.split("@")[0],
        role: uid === project.ownerId ? "owner" : "member",
      });
    });

    return list;
  }, [project, currentUser]);

  // Apply Search, Filters, and Sorting
  const filteredTasks = useMemo(() => {
    return projectTasks
      .filter((task) => {
        // Search by title keyword client-side
        if (filters.searchQuery.trim() !== "") {
          const q = filters.searchQuery.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(q);
          const matchesDesc = (task.description || "").toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc) return false;
        }

        // Status
        if (filters.status !== "all" && task.status !== filters.status) {
          return false;
        }

        // Priority
        if (filters.priority !== "all" && task.priority !== filters.priority) {
          return false;
        }

        // Assignee
        if (filters.assigneeId === "unassigned") {
          if (task.assigneeId !== null) return false;
        } else if (filters.assigneeId !== "all") {
          if (task.assigneeId !== filters.assigneeId) return false;
        }

        // Overdue (Incomplete task with dueDate before today)
        if (filters.isOverdueOnly && !isTaskOverdue(task)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === "dueDate_asc") {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (filters.sortBy === "dueDate_desc") {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return b.dueDate.localeCompare(a.dueDate);
        }
        if (filters.sortBy === "priority_desc") {
          const weights = { high: 3, medium: 2, low: 1 };
          return weights[b.priority] - weights[a.priority];
        }
        if (filters.sortBy === "priority_asc") {
          const weights = { high: 3, medium: 2, low: 1 };
          return weights[a.priority] - weights[b.priority];
        }
        // created_desc default
        return 0;
      });
  }, [projectTasks, filters]);

  // Task Handlers
  const handleCreateOrUpdateTask = async (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: any;
    assigneeId: string | null;
    dueDate: string | null;
  }) => {
    try {
      if (editingTask) {
        await updateTask(project.id, editingTask.id, data, currentUser, editingTask.version);
        showToast(t("taskUpdatedSuccess"), "success");
      } else {
        await createTask(project.id, data, currentUser);
        showToast(t("taskCreatedSuccess"), "success");
      }
      onRefreshActivities?.();
    } catch (err: any) {
      if (err.code === "CONCURRENCY_CONFLICT" || err.message?.includes("CONCURRENCY_CONFLICT")) {
        showToast(t("concurrencyConflictTask"), "error");
        throw new Error(t("concurrencyConflictTask"));
      }
      throw err;
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(project.id, task.id, newStatus, currentUser, task.version);
      showToast(t("statusUpdatedSuccess"), "success");
      onRefreshActivities?.();
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

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(project.id, taskToDelete.id, currentUser);
      showToast(t("taskDeletedSuccess"), "success");
      setTaskToDelete(null);
      onRefreshActivities?.();
    } catch (err: any) {
      console.error("Delete task error:", err);
      let msg = err.message;
      if (err.message === "notAuthorizedToDelete") {
        msg = t("notAuthorizedToDelete");
      }
      showToast(msg, "error");
    }
  };

  // Project Settings Handlers
  const handleUpdateProject = async (name: string, description: string) => {
    try {
      await updateProject(project.id, name, description, currentUser, project.version);
      showToast(t("taskUpdatedSuccess"), "success");
    } catch (err: any) {
      if (err.code === "CONCURRENCY_CONFLICT" || err.message?.includes("CONCURRENCY_CONFLICT")) {
        showToast(t("concurrencyConflictProject"), "error");
        throw new Error(t("concurrencyConflictProject"));
      }
      throw err;
    }
  };

  const handleAddMember = async (email: string) => {
    try {
      const res = await addProjectMember(project.id, email, currentUser);
      showToast(t("memberAddedSuccess"), "success");
      onRefreshActivities?.();
      return res;
    } catch (err: any) {
      let msg = err.message || t("authError");
      if (err.message === "userNotFound") msg = t("userNotFound");
      if (err.message === "alreadyMember") msg = t("alreadyMember");
      showToast(msg, "error");
      throw err;
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    await removeProjectMember(project.id, memberUid, currentUser);
    showToast(t("taskUpdatedSuccess"), "success");
    onRefreshActivities?.();
  };

  const handleDeleteProject = async () => {
    await deleteProject(project.id, currentUser);
    showToast(t("projectDeletedSuccess"), "success");
    onProjectDeleted();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
            title={t("backToDashboard")}
          >
            {direction === "rtl" ? (
              <ArrowRight className="w-5 h-5" />
            ) : (
              <ArrowLeft className="w-5 h-5" />
            )}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {project.name}
              </h1>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  isOwner
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                {isOwner && <Shield className="w-3 h-3" />}
                <span>{isOwner ? t("owner") : t("member")}</span>
              </span>
            </div>
            {project.description && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Team Members Button */}
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="p-2 sm:px-3 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title={t("viewTeamMembers")}
          >
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">{t("projectTeamMembers")}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-900">
              {projectMembers.length}
            </span>
          </button>

          {/* Owner Project Settings */}
          {isOwner && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 sm:px-2.5 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              title={t("projectSettings")}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{t("projectSettings")}</span>
            </button>
          )}

          {/* Create Task Button */}
          <button
            onClick={() => {
              setEditingTask(null);
              setDefaultColumnStatus("todo");
              setDefaultDueDate(null);
              setIsTaskModalOpen(true);
            }}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t("createTask")}</span>
          </button>
        </div>
      </div>

      {/* Role Permissions Information Banner */}
      <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
        isOwner
          ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200"
          : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isOwner ? "bg-amber-200/60 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200" : "bg-blue-200/60 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200"}`}>
            {isOwner ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
          <div>
            <span className="font-bold">
              {isOwner
                ? (language === "ar" ? "واجهة مالك المشروع:" : "Project Owner View:")
                : (language === "ar" ? "واجهة عضو الفريق (Member):" : "Team Member View:")}
            </span>{" "}
            <span className="opacity-90">
              {isOwner
                ? (language === "ar" ? "لديك كامل صلاحيات تعديل وحذف المشروع، إدارة ودعوة الأعضاء، ونقل وحذف كافة المهام." : "Full management authority: edit/delete project, manage members, move or delete any task.")
                : (language === "ar" ? "صلاحياتك محددة وفق وثيقة الـ SRS (يمكنك إنشاء مهام، وتعديل وحذف مهامك الخاصة، ونقل حالة المهام المسندة إليك فقط)." : "Scoped access per SRS: create tasks, edit/delete your own tasks, change status of assigned tasks.")}
            </span>
          </div>
        </div>

        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase border shrink-0 ${
          isOwner
            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200"
            : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200"
        }`}>
          {isOwner ? (language === "ar" ? "صلاحية كاملة" : "Full Access") : (language === "ar" ? "صلاحية عضو" : "Scoped Member")}
        </span>
      </div>

      {/* View Mode Tabs (Kanban vs Table vs Members vs Activity) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab("kanban")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === "kanban"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>{t("kanbanBoard")}</span>
          </button>

          <button
            onClick={() => setActiveTab("table")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === "table"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <List className="w-4 h-4" />
            <span>{t("taskTable")}</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === "calendar"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>{t("calendarView")}</span>
          </button>

          <button
            onClick={() => setActiveTab("gantt")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === "gantt"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <GanttChart className="w-4 h-4" />
            <span>{t("timelineView")}</span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === "members"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t("projectTeamMembers")}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "members"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}>
              {projectMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === "activity"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t("activityLog")}</span>
          </button>
        </div>

        {/* Clickable Member count tag with avatar stack */}
        <button
          type="button"
          onClick={() => setIsMembersModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-xs text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer group shadow-2xs self-start sm:self-auto"
          title={t("viewTeamMembers")}
        >
          {/* Mini Avatar Stack */}
          <div className="flex -space-x-1.5 rtl:space-x-reverse items-center">
            {projectMembers.slice(0, 3).map((m) => (
              <div
                key={m.uid}
                className="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 text-white text-[8px] font-bold flex items-center justify-center shrink-0"
              >
                {m.displayName ? m.displayName[0].toUpperCase() : "U"}
              </div>
            ))}
          </div>
          <Users className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
          <span>{projectMembers.length} {t("members")}</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === "activity" ? (
        <ActivityTimeline activities={activities} />
      ) : activeTab === "members" ? (
        <ProjectMembersTab
          project={project}
          members={projectMembers}
          tasks={projectTasks}
          currentUser={currentUser}
          onFilterByMember={(memberUid) => {
            setFilters((prev) => ({ ...prev, assigneeId: memberUid }));
            setActiveTab("kanban");
          }}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Filters Bar */}
          <TaskFiltersBar
            filters={filters}
            onChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
            onReset={() => setFilters(defaultFilters)}
            members={projectMembers}
            totalTasks={projectTasks.length}
            filteredCount={filteredTasks.length}
          />

          {/* Kanban, Table, Calendar, or Gantt View */}
          {activeTab === "kanban" && (
            <KanbanBoard
              tasks={filteredTasks}
              isOwner={isOwner}
              currentUser={currentUser}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={(task) => setTaskToDelete(task)}
              onStatusChange={handleStatusChange}
            />
          )}

          {activeTab === "table" && (
            <TaskTable
              tasks={filteredTasks}
              isOwner={isOwner}
              currentUser={currentUser}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={(task) => setTaskToDelete(task)}
              onStatusChange={handleStatusChange}
            />
          )}

          {activeTab === "calendar" && (
            <TaskCalendarView
              tasks={filteredTasks}
              isOwner={isOwner}
              currentUser={currentUser}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={(task) => setTaskToDelete(task)}
              onStatusChange={handleStatusChange}
              onQuickCreateTask={(dateStr) => {
                setEditingTask(null);
                setDefaultColumnStatus("todo");
                setDefaultDueDate(dateStr);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {activeTab === "gantt" && (
            <TaskGanttView
              tasks={filteredTasks}
              isOwner={isOwner}
              currentUser={currentUser}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={(task) => setTaskToDelete(task)}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      )}

      {/* Task Modal (Create / Edit) */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setDefaultDueDate(null);
        }}
        onSubmit={handleCreateOrUpdateTask}
        task={editingTask}
        members={projectMembers}
        defaultStatus={defaultColumnStatus}
        defaultDueDate={defaultDueDate}
        currentUser={currentUser}
        isOwner={isOwner}
      />

      {/* Task Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!taskToDelete}
        title={t("confirmDeleteTaskTitle")}
        description={t("confirmDeleteTaskDesc")}
        confirmLabel={t("delete")}
        onConfirm={handleConfirmDeleteTask}
        onClose={() => setTaskToDelete(null)}
      />

      {/* Project Settings Modal (Owner Only) */}
      {isOwner && (
        <ProjectSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setSettingsOpen(false)}
          project={project}
          members={projectMembers}
          currentUser={currentUser}
          onUpdateProject={handleUpdateProject}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {/* Project Members List Modal */}
      <ProjectMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        project={project}
        members={projectMembers}
        tasks={tasks}
        currentUser={currentUser}
        onFilterByMember={(memberUid) => {
          setFilters((prev) => ({ ...prev, assigneeId: memberUid }));
          setActiveTab("kanban");
        }}
        onAddMember={isOwner ? handleAddMember : undefined}
        onRemoveMember={isOwner ? handleRemoveMember : undefined}
      />
    </div>
  );
};
