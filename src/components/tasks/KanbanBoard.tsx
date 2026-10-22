import React, { useState } from "react";
import { Circle, Clock, CheckCircle2 } from "lucide-react";
import { Task, TaskStatus, UserProfile } from "@/src/types";
import { TaskCard } from "@/src/components/tasks/TaskCard";
import { useLanguage } from "@/src/context/LanguageContext";

interface KanbanBoardProps {
  tasks: Task[];
  isOwner: boolean;
  currentUser: UserProfile;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => Promise<void>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  isOwner,
  currentUser,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}) => {
  const { t } = useLanguage();
  const [activeDragCol, setActiveDragCol] = useState<TaskStatus | null>(null);

  const columns: {
    id: TaskStatus;
    title: string;
    icon: React.ReactNode;
    colorClasses: {
      header: string;
      badge: string;
      colBg: string;
      activeDrop: string;
    };
  }[] = [
    {
      id: "todo",
      title: t("todo"),
      icon: <Circle className="w-4 h-4 text-slate-500" />,
      colorClasses: {
        header: "text-slate-800 dark:text-slate-200",
        badge: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
        colBg: "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80",
        activeDrop: "ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20",
      },
    },
    {
      id: "in_progress",
      title: t("in_progress"),
      icon: <Clock className="w-4 h-4 text-amber-500 animate-spin-slow" />,
      colorClasses: {
        header: "text-amber-700 dark:text-amber-400",
        badge: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900",
        colBg: "bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/30",
        activeDrop: "ring-2 ring-amber-500 bg-amber-50/60 dark:bg-amber-950/30",
      },
    },
    {
      id: "done",
      title: t("done"),
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      colorClasses: {
        header: "text-emerald-700 dark:text-emerald-400",
        badge: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900",
        colBg: "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/30",
        activeDrop: "ring-2 ring-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30",
      },
    },
  ];

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDragCol !== colId) {
      setActiveDragCol(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    if (activeDragCol === colId) {
      setActiveDragCol(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setActiveDragCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    await onStatusChange(task, targetStatus);
  };

  return (
    <div className="space-y-3">
      {/* Helper text for drag & drop */}
      <div className="text-[11px] text-slate-400 dark:text-slate-500 text-end">
        {t("dragDropHelp")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-start">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isDropActive = activeDragCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl p-4 border transition-all duration-200 min-h-[420px] flex flex-col ${
                col.colorClasses.colBg
              } ${isDropActive ? col.colorClasses.activeDrop : ""}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className={`text-sm font-bold ${col.colorClasses.header}`}>
                    {col.title}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${col.colorClasses.badge}`}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards Container */}
              <div className="flex-1 space-y-3">
                {colTasks.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-center p-4 text-center">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {t("noTasksFound")}
                    </span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isOwner={isOwner}
                      currentUser={currentUser}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onStatusChange={onStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
