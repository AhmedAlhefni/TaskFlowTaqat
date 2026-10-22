import React from "react";
import { Folder, Users, CheckCircle2, Clock, AlertCircle, Shield } from "lucide-react";
import { Project, Task, UserProfile } from "@/src/types";
import { isTaskOverdue } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  currentUser: UserProfile;
  onClick: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  tasks,
  currentUser,
  onClick,
}) => {
  const { t } = useLanguage();
  const isOwner = project.ownerId === currentUser.uid;

  // Task metrics
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t)).length;

  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const memberCount = project.memberIds ? project.memberIds.length : 1;

  return (
    <div
      onClick={() => onClick(project)}
      className="group relative bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/60 shadow-xs hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Folder className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                isOwner
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              {isOwner && <Shield className="w-3 h-3" />}
              <span>{isOwner ? t("owner") : t("member")}</span>
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
            title={`${memberCount} ${t("projectTeamMembers")}`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{memberCount}</span>
          </div>
        </div>

        {/* Project Title & Description */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
          {project.name}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {project.description || t("projectDescPlaceholder")}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-500 dark:text-slate-400">
              {t("projectProgress")}
            </span>
            <span className="text-slate-900 dark:text-white">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100
                  ? "bg-emerald-500"
                  : progressPercent > 50
                  ? "bg-indigo-600"
                  : "bg-indigo-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Task Counter Metrics */}
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title={t("tasksDone")}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{doneTasks}</span>
            </span>
            <span className="flex items-center gap-1" title={t("tasksInProgress")}>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{inProgressTasks}</span>
            </span>
            {overdueTasks > 0 && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold" title={t("overdueTasks")}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{overdueTasks}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {totalTasks} {t("totalTasks")}
          </span>
        </div>
      </div>
    </div>
  );
};
