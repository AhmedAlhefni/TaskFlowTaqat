import React from "react";
import {
  Calendar,
  User,
  Edit2,
  Trash2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Task, TaskPriority, TaskStatus, UserProfile } from "@/src/types";
import { isTaskOverdue, formatDate } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";

interface TaskTableProps {
  tasks: Task[];
  isOwner: boolean;
  currentUser: UserProfile;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  isOwner,
  currentUser,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}) => {
  const { t, language } = useLanguage();

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("noTasksFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400">
              <th className="py-3.5 px-4 text-start">{t("taskTitle")}</th>
              <th className="py-3.5 px-4 text-start">{t("status")}</th>
              <th className="py-3.5 px-4 text-start">{t("priority")}</th>
              <th className="py-3.5 px-4 text-start">{t("dueDate")}</th>
              <th className="py-3.5 px-4 text-start">{t("assignee")}</th>
              <th className="py-3.5 px-4 text-end"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            {tasks.map((task) => {
              const overdue = isTaskOverdue(task);
              const isCreator = task.createdBy === currentUser.uid;
              const isAssignee = task.assigneeId === currentUser.uid;

              const canEdit = isOwner || isCreator || isAssignee;
              const canDelete = isOwner || isCreator;
              const canChangeStatus = isOwner || isAssignee;

              return (
                <tr
                  key={task.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Title & Desc */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-bold text-slate-900 dark:text-white leading-snug">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-sm">
                        {task.description}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {canChangeStatus ? (
                      <select
                        value={task.status}
                        onChange={(e) =>
                          onStatusChange(task, e.target.value as TaskStatus)
                        }
                        className="text-xs font-semibold py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="todo">{t("todo")}</option>
                        <option value="in_progress">{t("in_progress")}</option>
                        <option value="done">{t("done")}</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>{t(task.status)}</span>
                      </span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                        task.priority === "high"
                          ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                          : task.priority === "medium"
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {t(task.priority)}
                    </span>
                  </td>

                  {/* Due Date & Overdue flag */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        overdue
                          ? "text-rose-600 dark:text-rose-400 font-bold"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(task.dueDate, language)}</span>
                      {overdue && (
                        <span className="ms-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-rose-600 text-white">
                          {t("filterOverdue")}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Assignee */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {task.assigneeId ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{task.assigneeName || task.assigneeEmail?.split("@")[0]}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {t("unassigned")}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-end">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => onEditTask(task)}
                          title={t("editTask")}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onDeleteTask(task)}
                          title={t("deleteTask")}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
