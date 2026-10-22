import React from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckSquare } from "lucide-react";
import type { Project, Task, UserProfile } from "@/src/types";
import { formatDate, isTaskOverdue } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";
import type { DashboardTaskFilter } from "@/src/hooks/useDashboardData";

interface DashboardTaskFeedProps {
  taskFilter: DashboardTaskFilter;
  displayTasks: Task[];
  myAssignedTasks: Task[];
  projectMap: Map<string, Project>;
  currentUser: UserProfile;
  onNavigateToMyTasks: () => void;
  onOpenProject: (project: Project) => void;
}

export const DashboardTaskFeed: React.FC<DashboardTaskFeedProps> = ({
  taskFilter,
  displayTasks,
  myAssignedTasks,
  projectMap,
  currentUser,
  onNavigateToMyTasks,
  onOpenProject,
}) => {
  const { t, direction, language } = useLanguage();

  const title = taskFilter === "my"
    ? t("myTasksTitle")
    : taskFilter === "in_progress"
      ? (language === "ar" ? "المهام الجارية قيد التنفيذ" : "In Progress Tasks")
      : taskFilter === "done"
        ? (language === "ar" ? "المهام المكتملة بنجاح" : "Completed Tasks")
        : taskFilter === "todo"
          ? (language === "ar" ? "المهام بانتظار البدء" : "To Do Tasks")
          : taskFilter === "overdue"
            ? (language === "ar" ? "المهام المتأخرة عن موعدها" : "Overdue Tasks")
            : (language === "ar" ? "أحدث المهام في مساحات العمل" : "Workspace Tasks Feed");

  return (
    <section id="interactive-tasks-section" className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-400">
              {language === "ar"
                ? `عرض ${displayTasks.length} مهمة مطابقة للفلتر المحدد`
                : `Showing ${displayTasks.length} tasks matching current active filter`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateToMyTasks}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>{language === "ar" ? "إدارة كل مهامي" : "Manage all my tasks"}</span>
          {direction === "rtl" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {displayTasks.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <CheckSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === "ar" ? "لا توجد مهام مطابقة للفلتر المحدد حالياً." : "No tasks match the active filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayTasks.slice(0, 6).map((task) => {
            const overdue = isTaskOverdue(task);
            const parentProject = projectMap.get(task.projectId);
            return (
              <div key={task.id} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${task.status === "done" ? "bg-emerald-500" : task.status === "in_progress" ? "bg-blue-500" : "bg-slate-400"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                        {task.title}
                      </span>
                      {overdue && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white shrink-0"><AlertCircle className="inline w-3 h-3 me-0.5" />{language === "ar" ? "متأخرة" : "Overdue"}</span>}
                      {task.assigneeId === currentUser.uid && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 shrink-0">{language === "ar" ? "معينة لك" : "Assigned to you"}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      {parentProject && <span className="font-semibold text-slate-600 dark:text-slate-300">{parentProject.name}</span>}
                      {task.dueDate && <span>• {formatDate(task.dueDate, language)}</span>}
                      {task.assigneeName && <span>• {task.assigneeName}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${task.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900" : task.priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900" : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
                    {t(task.priority)}
                  </span>
                  {parentProject && (
                    <button type="button" onClick={() => onOpenProject(parentProject)} aria-label={t("openInProject")} title={t("openInProject")} className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
                      {direction === "rtl" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
