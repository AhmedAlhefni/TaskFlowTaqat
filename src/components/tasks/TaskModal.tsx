import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Calendar, User, AlertCircle, FolderKanban, Lock, Eye, CheckSquare } from "lucide-react";
import { Task, TaskPriority, TaskStatus, ProjectMemberInfo, Project, UserProfile } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";
import { createTaskSchema, TaskFormData } from "@/src/lib/schemas";
import { ModalLayer } from "@/src/components/common/ModalLayer";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string | null;
    dueDate: string | null;
    projectId?: string;
  }) => Promise<void>;
  task?: Task | null;
  members?: ProjectMemberInfo[];
  projects?: Project[];
  selectedProjectId?: string;
  defaultStatus?: TaskStatus;
  defaultDueDate?: string | null;
  currentUser?: UserProfile;
  isOwner?: boolean;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  members = [],
  projects,
  selectedProjectId,
  defaultStatus = "todo",
  defaultDueDate = null,
  currentUser,
  isOwner = false,
}) => {
  const { t, language } = useLanguage();

  const taskSchema = React.useMemo(() => createTaskSchema(t), [t]);

  // Authorization checks per SRS matrix
  const isCreator = Boolean(task && currentUser && task.createdBy === currentUser.uid);
  const isAssignee = Boolean(task && currentUser && task.assigneeId === currentUser.uid);

  // Can user edit core task details (title, description, priority, dueDate, assignee)?
  // Allowed if creating a new task, or if user is project owner, or if user created the task
  const canEditDetails = !task || isOwner || isCreator;

  // Can user change status? Allowed if creating new task, or if owner, or if assignee
  const canChangeStatus = !task || isOwner || isAssignee;

  // Read-only inspection mode: when regular member is neither owner nor creator nor assignee
  const isReadOnly = Boolean(task && !canEditDetails && !canChangeStatus);

  // Status-only update mode: when member is assignee but not creator/owner
  const isStatusOnly = Boolean(task && !canEditDetails && canChangeStatus);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setFocus,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: defaultStatus,
      priority: "medium",
      assigneeId: "unassigned",
      dueDate: "",
      projectId: selectedProjectId || projects?.[0]?.id || "",
    },
    mode: "onChange",
  });

  const titleValue = watch("title") || "";
  const descValue = watch("description") || "";
  const activeProjectId = watch("projectId") || selectedProjectId || (projects?.[0]?.id || "");

  // Compute members when project is selected from projects list
  const currentMembers: ProjectMemberInfo[] = React.useMemo(() => {
    if (members && members.length > 0) return members;
    if (!projects || !activeProjectId) return [];

    const foundProj = projects.find((p) => p.id === activeProjectId);
    if (!foundProj) return [];

    const list: ProjectMemberInfo[] = [];
    foundProj.memberIds.forEach((uid) => {
      const info = foundProj.members?.[uid];
      list.push({
        uid,
        email: info?.email || "",
        displayName: info?.displayName || (uid === foundProj.ownerId ? "Owner" : "Member"),
        role: uid === foundProj.ownerId ? "owner" : "member",
      });
    });
    return list;
  }, [members, projects, activeProjectId]);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        reset({
          title: task.title || "",
          description: task.description || "",
          status: task.status || "todo",
          priority: task.priority || "medium",
          assigneeId: task.assigneeId || "unassigned",
          dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
          projectId: task.projectId || "",
        });
      } else {
        const initProjectId = selectedProjectId || (projects?.[0]?.id || "");
        reset({
          title: "",
          description: "",
          status: defaultStatus,
          priority: "medium",
          assigneeId: "unassigned",
          dueDate: defaultDueDate || "",
          projectId: initProjectId,
        });
      }
      if (canEditDetails) {
        setTimeout(() => {
          setFocus("title");
        }, 100);
      }
    }
  }, [task, isOpen, defaultStatus, defaultDueDate, selectedProjectId, projects, reset, setFocus, canEditDetails]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: TaskFormData) => {
    if (isReadOnly) {
      onClose();
      return;
    }
    try {
      await onSubmit({
        title: data.title.trim(),
        description: (data.description || "").trim(),
        status: data.status,
        priority: data.priority,
        assigneeId: !data.assigneeId || data.assigneeId === "unassigned" ? null : data.assigneeId,
        dueDate: data.dueDate?.trim() || null,
        projectId: data.projectId || activeProjectId,
      });
      onClose();
    } catch (err: any) {
      console.error("Task submission error:", err);
      setError("root", {
        message: err.message || t("authError"),
      });
    }
  };

  return (
    <ModalLayer onClose={onClose} dismissible={!isSubmitting}>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {isReadOnly ? (
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            ) : isStatusOnly ? (
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <CheckSquare className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isReadOnly
                  ? (language === "ar" ? "تفاصيل المهمة" : "Task Details")
                  : isStatusOnly
                  ? (language === "ar" ? "تفاصيل المهمة وتحديث الحالة" : "Task Details & Status")
                  : task
                  ? t("editTask")
                  : t("createTask")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isReadOnly
                  ? (language === "ar" ? "وضع العرض فقط (غير متاح للتعديل)" : "View-only mode (Non-editable)")
                  : isStatusOnly
                  ? (language === "ar" ? "أنت العضو المكلّف: يمكنك تحديث حالة المهمة" : "You are assigned: you can update task status")
                  : task
                  ? (language === "ar" ? "تعديل بيانات المهمة وموعد الاستحقاق" : "Update task info and due date")
                  : (language === "ar" ? "إضافة مهمة جديدة إلى المشروع" : "Add a new task to project")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={t("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          {/* Permission Notice Banner for Read-Only Members */}
          {isReadOnly && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">
                  {language === "ar" ? "عرض تفاصيل المهمة (للقراءة فقط)" : "Viewing Task Details (Read-Only)"}
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  {language === "ar"
                    ? "أنت تشاهد هذه المهمة كعضو في المشروع. صلاحية تعديل تفاصيلها محصورة بمالك المشروع أو منشئ المهمة فقط."
                    : "You are viewing this task as a member. Modification is restricted to the project owner or creator."}
                </p>
              </div>
            </div>
          )}

          {/* Status-Only Notice Banner for Assignees */}
          {isStatusOnly && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in">
              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">
                  {language === "ar" ? "مهمة مكلّف بها" : "Assigned Task"}
                </p>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                  {language === "ar"
                    ? "يمكنك تحديث حالة إنجاز المهمة (قيد التنفيذ / مكتملة). تعديل العنوان أو الموعد محصور بمالك المشروع أو المنشئ."
                    : "You can update the status of this task. Modifying the title or due date requires the owner or creator."}
                </p>
              </div>
            </div>
          )}

          {errors.root && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Project Picker if creating from global context */}
          {!task && projects && projects.length > 0 && !selectedProjectId && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t("selectProject")} *</span>
              </label>
              <select
                {...register("projectId", {
                  onChange: () => {
                    setValue("assigneeId", "unassigned");
                  },
                })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-600 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.projectId.message}</span>
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("taskTitle")} *
              </label>
              {canEditDetails && (
                <span className={`text-[10px] font-mono ${titleValue.length > 120 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                  {titleValue.length}/120
                </span>
              )}
            </div>
            <input
              {...register("title")}
              type="text"
              disabled={!canEditDetails}
              maxLength={120}
              placeholder={t("taskTitlePlaceholder")}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all ${
                !canEditDetails
                  ? "bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-default select-text"
                  : errors.title
                  ? "bg-slate-50 dark:bg-slate-800/80 border-rose-300 dark:border-rose-800 focus:ring-2 focus:ring-rose-500/20"
                  : "bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.title.message}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("taskDesc")}
              </label>
              {canEditDetails && (
                <span className={`text-[10px] font-mono ${descValue.length > 1000 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                  {descValue.length}/1000
                </span>
              )}
            </div>
            <textarea
              {...register("description")}
              rows={3}
              disabled={!canEditDetails}
              maxLength={1000}
              placeholder={t("taskDescPlaceholder")}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all resize-none ${
                !canEditDetails
                  ? "bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-default select-text"
                  : "bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.description.message}</span>
              </p>
            )}
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("status")}
                </label>
                {!canChangeStatus && (
                  <span
                    className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold"
                    title={language === "ar" ? "تغيير الحالة متاح للمالك أو العضو المسند إليه فقط" : "Only owner or assignee can change status"}
                  >
                    <Lock className="w-3 h-3" />
                    <span>{language === "ar" ? "مقيّد" : "Locked"}</span>
                  </span>
                )}
              </div>
              {canChangeStatus ? (
                <select
                  {...register("status")}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="todo">{t("todo")}</option>
                  <option value="in_progress">{t("in_progress")}</option>
                  <option value="done">{t("done")}</option>
                </select>
              ) : (
                <div
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 flex items-center justify-between cursor-default select-none"
                  title={language === "ar" ? "تغيير الحالة متاح للمالك أو العضو المسند إليه فقط" : "Only owner or assignee can change status"}
                >
                  <span>{t(task?.status || "todo")}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("priority")}
              </label>
              {canEditDetails ? (
                <select
                  {...register("priority")}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="low">{t("low")}</option>
                  <option value="medium">{t("medium")}</option>
                  <option value="high">{t("high")}</option>
                </select>
              ) : (
                <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-default select-none">
                  <span>{t(task?.priority || "medium")}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    task?.priority === "high" ? "bg-rose-500" : task?.priority === "low" ? "bg-emerald-500" : "bg-amber-500"
                  }`} />
                </div>
              )}
            </div>
          </div>

          {/* Due date & Assignee Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("dueDate")}
              </label>
              <div className="relative">
                <input
                  {...register("dueDate")}
                  type="date"
                  disabled={!canEditDetails}
                  className={`w-full px-3 py-2 rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all ${
                    !canEditDetails
                      ? "bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-default"
                      : "bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 cursor-pointer"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("assignee")}
              </label>
              {canEditDetails ? (
                <select
                  {...register("assigneeId")}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="unassigned">{t("unassigned")}</option>
                  {currentMembers.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName || m.email} ({m.role === "owner" ? t("owner") : t("member")})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-default select-none">
                  <span>{task?.assigneeName || t("unassigned")}</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            {isReadOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                {t("close")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (canEditDetails && titleValue.trim().length < 3)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>
                    {isStatusOnly
                      ? (language === "ar" ? "تحديث الحالة" : "Update Status")
                      : t("save")}
                  </span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
    </ModalLayer>
  );
};
