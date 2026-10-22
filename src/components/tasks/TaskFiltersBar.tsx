import React from "react";
import { Search, Filter, RotateCcw, AlertCircle, ArrowUpDown } from "lucide-react";
import { TaskFilters, TaskPriority, TaskStatus, ProjectMemberInfo } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onChange: (updated: Partial<TaskFilters>) => void;
  onReset: () => void;
  members: ProjectMemberInfo[];
  totalTasks: number;
  filteredCount: number;
}

export const TaskFiltersBar: React.FC<TaskFiltersBarProps> = ({
  filters,
  onChange,
  onReset,
  members,
  totalTasks,
  filteredCount,
}) => {
  const { t } = useLanguage();

  const hasActiveFilters =
    filters.searchQuery.trim() !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.assigneeId !== "all" ||
    filters.isOverdueOnly ||
    filters.sortBy !== "created_desc";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
      {/* Top row: Search input & Overdue quick toggle & Reset button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ searchQuery: e.target.value })}
            placeholder={t("searchPlaceholder")}
            className="w-full ps-10 pe-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-2.5" />
        </div>

        {/* Live Evaluation Feature: Overdue filter toggle */}
        <button
          type="button"
          onClick={() => onChange({ isOverdueOnly: !filters.isOverdueOnly })}
          className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            filters.isOverdueOnly
              ? "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/30"
              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>{t("filterOverdue")}</span>
        </button>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("resetFilters")}</span>
          </button>
        )}
      </div>

      {/* Bottom row: Filter selectors (Status, Priority, Assignee, Sort) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        {/* Status */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {t("filterStatus")}
          </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as any })}
            className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">{t("all")}</option>
            <option value="todo">{t("todo")}</option>
            <option value="in_progress">{t("in_progress")}</option>
            <option value="done">{t("done")}</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {t("filterPriority")}
          </label>
          <select
            value={filters.priority}
            onChange={(e) => onChange({ priority: e.target.value as any })}
            className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">{t("all")}</option>
            <option value="high">{t("high")}</option>
            <option value="medium">{t("medium")}</option>
            <option value="low">{t("low")}</option>
          </select>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {t("filterAssignee")}
          </label>
          <select
            value={filters.assigneeId}
            onChange={(e) => onChange({ assigneeId: e.target.value as any })}
            className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">{t("all")}</option>
            <option value="unassigned">{t("unassigned")}</option>
            {members.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.displayName || m.email}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {t("sortBy")}
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => onChange({ sortBy: e.target.value as any })}
            className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="created_desc">{t("sortByCreatedDesc")}</option>
            <option value="dueDate_asc">{t("sortByDueDateAsc")}</option>
            <option value="dueDate_desc">{t("sortByDueDateDesc")}</option>
            <option value="priority_desc">{t("sortByPriorityDesc")}</option>
            <option value="priority_asc">{t("sortByPriorityAsc")}</option>
          </select>
        </div>
      </div>

      {/* Task Count Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span>
          {filteredCount === totalTasks ? (
            <span>{totalTasks} {t("totalTasks")}</span>
          ) : (
            <span>
              {filteredCount} / {totalTasks} {t("totalTasks")}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};
