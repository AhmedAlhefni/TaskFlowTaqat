import React, { useState, useMemo } from "react";
import { ModalLayer } from "@/src/components/common/ModalLayer";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  User,
  Filter,
  CheckSquare,
  Sparkles,
  CalendarDays,
  X,
  ExternalLink,
  Eye,
  Pencil,
} from "lucide-react";
import { Task, TaskStatus, UserProfile } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";
import { isTaskOverdue, formatDate, getTodayDateString } from "@/src/lib/dateUtils";

interface TaskCalendarViewProps {
  tasks: Task[];
  isOwner: boolean;
  currentUser: UserProfile;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
  onQuickCreateTask?: (dateStr: string) => void;
}

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  tasks,
  isOwner,
  currentUser,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onQuickCreateTask,
}) => {
  const { t, direction, language } = useLanguage();
  const todayStr = getTodayDateString();

  // Active view: month vs week
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // Current view cursor date (defaults to today)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Show unscheduled tasks panel
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  // Popover modal for days with multiple tasks
  const [selectedDayTasks, setSelectedDayTasks] = useState<{
    dateStr: string;
    tasks: Task[];
  } | null>(null);

  // Month navigation
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Group tasks by dueDate (YYYY-MM-DD)
  const { tasksByDate, unscheduledTasks } = useMemo(() => {
    const map = new Map<string, Task[]>();
    const unscheduled: Task[] = [];

    tasks.forEach((task) => {
      if (!task.dueDate) {
        unscheduled.push(task);
      } else {
        const dStr = task.dueDate.split("T")[0];
        const existing = map.get(dStr) || [];
        existing.push(task);
        map.set(dStr, existing);
      }
    });

    return { tasksByDate: map, unscheduledTasks: unscheduled };
  }, [tasks]);

  // Compute month days grid
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Weekday of the first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInCurrentMonth = lastDayOfMonth.getDate();

    // Days from previous month to fill the first row
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const days: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayFormatted = String(d.getDate()).padStart(2, "0");
      const dStr = `${d.getFullYear()}-${m}-${dayFormatted}`;
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const m = String(currentMonth + 1).padStart(2, "0");
      const dayFormatted = String(i).padStart(2, "0");
      const dStr = `${currentYear}-${m}-${dayFormatted}`;
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
      });
    }

    // Days from next month to fill complete weeks (multiples of 7)
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayFormatted = String(i).padStart(2, "0");
      const dStr = `${d.getFullYear()}-${m}-${dayFormatted}`;
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  // Compute week days (7 days around currentDate)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayFormatted = String(d.getDate()).padStart(2, "0");
      const dStr = `${y}-${m}-${dayFormatted}`;
      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: d.getDate(),
        isToday: dStr === todayStr,
      });
    }
    return days;
  }, [currentDate, todayStr]);

  // Day names localized
  const weekdayNames = useMemo(() => {
    if (language === "ar") {
      return ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    }
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }, [language]);

  // Short day names for mobile viewports
  const weekdayShortNames = useMemo(() => {
    if (language === "ar") {
      return ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    }
    return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  }, [language]);

  // Month title formatted
  const monthTitle = useMemo(() => {
    return currentDate.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate, language]);

  // Priority color badge helper
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-rose-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-emerald-500";
      default:
        return "bg-slate-400";
    }
  };

  // Status style helper
  const getStatusStyles = (task: Task) => {
    const overdue = isTaskOverdue(task);
    if (overdue) {
      return "border-rose-300 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-950/70";
    }
    switch (task.status) {
      case "done":
        return "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 line-through opacity-85 hover:opacity-100";
      case "in_progress":
        return "border-blue-200 dark:border-blue-900/60 bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/70";
      case "todo":
      default:
        return "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700";
    }
  };

  // User action title helper based on permissions
  const getTaskActionTitle = (task: Task) => {
    const isCreator = task.createdBy === currentUser.uid;
    const isAssignee = task.assigneeId === currentUser.uid;
    if (isOwner || isCreator) {
      return `${task.title} - ${t(task.status)} (${language === "ar" ? "انقر لتعديل المهمة" : "Click to edit task"})`;
    }
    if (isAssignee) {
      return `${task.title} - ${t(task.status)} (${language === "ar" ? "انقر لتحديث حالة المهمة" : "Click to update status"})`;
    }
    return `${task.title} - ${t(task.status)} (${language === "ar" ? "انقر لعرض تفاصيل المهمة" : "Click to view task details"})`;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title={viewMode === "month" ? t("prevMonth") : t("prevWeek")}
              aria-label="Previous"
            >
              {direction === "rtl" ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleGoToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              {t("today")}
            </button>

            <button
              onClick={handleNext}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title={viewMode === "month" ? t("nextMonth") : t("nextWeek")}
              aria-label="Next"
            >
              {direction === "rtl" ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize">
              {monthTitle}
            </h2>
          </div>
        </div>

        {/* View Switcher & Unscheduled Tasks Toggle */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Mode Switch (Month / Week) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("monthView")}
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("weekView")}
            </button>
          </div>

          {/* Unscheduled Tasks Button */}
          <button
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showUnscheduled
                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("unscheduledTasks")}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                unscheduledTasks.length > 0
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {unscheduledTasks.length}
            </span>
          </button>
        </div>
      </div>

      {/* Unscheduled Tasks Drawer/Panel (if opened) */}
      {showUnscheduled && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("unscheduledTasks")} ({unscheduledTasks.length})
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === "ar"
                  ? "انقر على أي مهمة لتحديد موعد استحقاق لها لتظهر في التقويم"
                  : "Click any task to assign a due date to show on the calendar"}
              </span>
            </div>
            <button
              onClick={() => setShowUnscheduled(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {unscheduledTasks.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              {language === "ar"
                ? "رائع! جميع مهام المشروع محددة بمواعيد تسليم مجدولة."
                : "Great! All project tasks have scheduled due dates."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {unscheduledTasks.map((task) => {
                const isCreator = task.createdBy === currentUser.uid;
                const isAssignee = task.assigneeId === currentUser.uid;
                const canEdit = isOwner || isCreator;

                return (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer transition-all flex items-start justify-between gap-2 group"
                    title={getTaskActionTitle(task)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${getPriorityBadgeClass(task.priority)}`}
                        />
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {t(task.priority)}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {task.title}
                      </h4>
                    </div>
                    {canEdit ? (
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md shrink-0 border border-indigo-200 dark:border-indigo-900">
                        {t("scheduleTask")}
                      </span>
                    ) : isAssignee ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md shrink-0 border border-emerald-200 dark:border-emerald-900">
                        {language === "ar" ? "تحديث الحالة" : "Status"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" />
                        {language === "ar" ? "عرض" : "View"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
          <div className="min-w-[580px] sm:min-w-0">
            {/* Weekday Table Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-2.5">
              {weekdayNames.map((dayName, idx) => (
                <div key={idx} className="tracking-wide">
                  <span className="hidden sm:inline">{dayName}</span>
                  <span className="sm:hidden">{weekdayShortNames[idx]}</span>
                </div>
              ))}
            </div>

            {/* Month Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80 rtl:divide-x-reverse border-b border-slate-200 dark:border-slate-800">
            {monthDays.map((cell, idx) => {
              const dayTasks = tasksByDate.get(cell.dateStr) || [];
              const isToday = cell.isToday;
              const isCurrentMonth = cell.isCurrentMonth;
              const hasTasks = dayTasks.length > 0;

              return (
                <div
                  key={idx}
                  className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors group relative ${
                    isCurrentMonth
                      ? "bg-white dark:bg-slate-900"
                      : "bg-slate-50/50 dark:bg-slate-950/40 opacity-55"
                  } ${isToday ? "ring-2 ring-indigo-500/80 ring-inset bg-indigo-50/20 dark:bg-indigo-950/10" : ""}`}
                >
                  {/* Day Number and Quick Add Button */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-transform ${
                        isToday
                          ? "bg-indigo-600 text-white shadow-xs scale-105"
                          : isCurrentMonth
                          ? "text-slate-700 dark:text-slate-300 group-hover:text-indigo-600"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Quick Add Task Button for this specific day */}
                    {onQuickCreateTask && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickCreateTask(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title={`${t("quickAddTask")} (${cell.dateStr})`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Tasks List in Cell (Max 3, then "+ X more" badge) */}
                  <div className="space-y-1 flex-1 flex flex-col justify-start">
                    {dayTasks.slice(0, 3).map((task) => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <div
                          key={task.id}
                          onClick={() => onEditTask(task)}
                          className={`px-1.5 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs truncate ${getStatusStyles(
                            task
                          )}`}
                          title={getTaskActionTitle(task)}
                        >
                          {/* Priority / Status dot */}
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityBadgeClass(
                              task.priority
                            )}`}
                          />

                          {/* Overdue indicator */}
                          {overdue && (
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                          )}

                          {/* Task Title */}
                          <span className="truncate flex-1 font-semibold">{task.title}</span>

                          {/* Assignee initial if assigned */}
                          {task.assigneeName && (
                            <span className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[8px] font-bold flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                              {task.assigneeName[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* "+ X More" button if > 3 tasks */}
                    {dayTasks.length > 3 && (
                      <button
                        onClick={() =>
                          setSelectedDayTasks({
                            dateStr: cell.dateStr,
                            tasks: dayTasks,
                          })
                        }
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-center w-full py-0.5 rounded bg-indigo-50/60 dark:bg-indigo-950/40 cursor-pointer"
                      >
                        +{dayTasks.length - 3}{" "}
                        {language === "ar" ? "مهام إضافية" : "more tasks"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px] divide-x divide-slate-200 dark:divide-slate-800 rtl:divide-x-reverse">
            {weekDays.map((col, idx) => {
              const dayTasks = tasksByDate.get(col.dateStr) || [];
              const dayName = weekdayNames[col.date.getDay()];
              const isToday = col.isToday;

              return (
                <div
                  key={idx}
                  className={`flex flex-col min-h-[420px] ${
                    isToday ? "bg-indigo-50/15 dark:bg-indigo-950/10" : ""
                  }`}
                >
                  {/* Column Header */}
                  <div
                    className={`p-3 border-b border-slate-200 dark:border-slate-800 text-center ${
                      isToday
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wider">{dayName}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span
                        className={`text-sm font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? "bg-indigo-600 text-white"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {col.dayNumber}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {dayTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Tasks Container */}
                  <div className="p-2.5 flex-1 space-y-2 overflow-y-auto">
                    {dayTasks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-3 opacity-40 hover:opacity-100 transition-opacity">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
                          {language === "ar" ? "لا توجد مهام" : "No tasks"}
                        </span>
                        {onQuickCreateTask && (
                          <button
                            onClick={() => onQuickCreateTask(col.dateStr)}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{language === "ar" ? "إضافة" : "Add"}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                        const overdue = isTaskOverdue(task);
                        return (
                          <div
                            key={task.id}
                            onClick={() => onEditTask(task)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-sm hover:shadow transition-all group flex flex-col gap-1.5 ${getStatusStyles(
                              task
                            )}`}
                            title={getTaskActionTitle(task)}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 ${
                                  task.priority === "high"
                                    ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                                    : task.priority === "medium"
                                    ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${getPriorityBadgeClass(
                                    task.priority
                                  )}`}
                                />
                                {t(task.priority)}
                              </span>

                              {overdue && (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  {language === "ar" ? "متأخرة" : "Overdue"}
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-500">
                              <span className="font-semibold">{t(task.status)}</span>
                              <div className="flex items-center gap-1.5">
                                {task.assigneeName ? (
                                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                    <User className="w-3 h-3" />
                                    {task.assigneeName}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">
                                    {t("unassigned")}
                                  </span>
                                )}
                                {!isOwner && task.createdBy !== currentUser.uid && task.assigneeId !== currentUser.uid && (
                                  <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Day All Tasks Modal Popover */}
      {selectedDayTasks && (
        <ModalLayer onClose={() => setSelectedDayTasks(null)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {formatDate(selectedDayTasks.dateStr, language as "ar" | "en")}{" "}
                  <span className="text-slate-400 font-normal">
                    ({selectedDayTasks.tasks.length}{" "}
                    {language === "ar" ? "مهام" : "tasks"})
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayTasks(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1">
              {selectedDayTasks.tasks.map((task) => {
                const overdue = isTaskOverdue(task);
                const isCreator = task.createdBy === currentUser.uid;
                const isAssignee = task.assigneeId === currentUser.uid;
                const canEdit = isOwner || isCreator;

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedDayTasks(null);
                      onEditTask(task);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-3 ${getStatusStyles(
                      task
                    )}`}
                    title={getTaskActionTitle(task)}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${getPriorityBadgeClass(
                            task.priority
                          )}`}
                        />
                        <h4 className="font-bold text-slate-900 dark:text-white truncate">
                          {task.title}
                        </h4>
                        {overdue && (
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-100 dark:bg-rose-950 px-1.5 py-0.2 rounded">
                            {language === "ar" ? "متأخرة" : "Overdue"}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span>{t(task.status)}</span>
                        <span>•</span>
                        <span>
                          {task.assigneeName || t("unassigned")}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {canEdit ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/50">
                          <Pencil className="w-3 h-3" />
                          {language === "ar" ? "تعديل" : "Edit"}
                        </span>
                      ) : isAssignee ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                          <CheckSquare className="w-3 h-3" />
                          {language === "ar" ? "تحديث الحالة" : "Status"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          <Eye className="w-3 h-3" />
                          {language === "ar" ? "عرض التفاصيل" : "View"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
              {onQuickCreateTask && (
                <button
                  onClick={() => {
                    const d = selectedDayTasks.dateStr;
                    setSelectedDayTasks(null);
                    onQuickCreateTask(d);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t("quickAddTask")}</span>
                </button>
              )}
              <button
                onClick={() => setSelectedDayTasks(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer ml-auto"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
        </ModalLayer>
      )}
    </div>
  );
};
