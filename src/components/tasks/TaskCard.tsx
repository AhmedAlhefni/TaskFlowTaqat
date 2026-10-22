import React from "react";
import {
  Calendar,
  User,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Task, TaskPriority, TaskStatus, UserProfile } from "@/src/types";
import { isTaskOverdue, formatDate } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";

interface TaskCardProps {
  task: Task;
  isOwner: boolean;
  currentUser: UserProfile;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  isDragging?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isOwner,
  currentUser,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const { t, language } = useLanguage();
  const overdue = isTaskOverdue(task);

  // Authorization checks per SRS matrix
  const isCreator = task.createdBy === currentUser.uid;
  const isAssignee = task.assigneeId === currentUser.uid;

  const canEdit = isOwner || isCreator || isAssignee;
  const canDelete = isOwner || isCreator;
  const canChangeStatus = isOwner || isAssignee;

  // Drag start
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900",
          label: t("high"),
        };
      case "medium":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
          label: t("medium"),
        };
      case "low":
      default:
        return {
          bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
          label: t("low"),
        };
    }
  };

  const pBadge = getPriorityBadge(task.priority);

  return (
    <div
      draggable={canChangeStatus}
      onDragStart={handleDragStart}
      className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all duration-200 shadow-xs hover:shadow-md ${
        canChangeStatus ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      } ${
        overdue
          ? "border-rose-300 dark:border-rose-900/80 ring-1 ring-rose-400/20"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      {/* Top Header: Priority badge & Quick Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${pBadge.bg}`}
          >
            {pBadge.label}
          </span>
          {overdue && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white animate-pulse">
              <AlertCircle className="w-3 h-3" />
              <span>{language === "ar" ? "متأخرة" : "Overdue"}</span>
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              title={t("editTask")}
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
              title={t("deleteTask")}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Description excerpt */}
      {task.description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer: Due date & Assignee */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        {/* Due date */}
        <div
          className={`flex items-center gap-1.5 font-medium ${
            overdue
              ? "text-rose-600 dark:text-rose-400 font-bold"
              : "text-slate-500 dark:text-slate-400"
          }`}
          title={task.dueDate || undefined}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-[11px]">{formatDate(task.dueDate, language)}</span>
        </div>

        {/* Assignee pill */}
        <div className="flex items-center gap-1.5">
          {task.assigneeId ? (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
              title={`${t("assignee")}: ${task.assigneeName || task.assigneeEmail || ""}`}
            >
              <User className="w-3 h-3 text-indigo-500" />
              <span className="max-w-[80px] truncate">{task.assigneeName || task.assigneeEmail?.split("@")[0]}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              {t("unassigned")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
