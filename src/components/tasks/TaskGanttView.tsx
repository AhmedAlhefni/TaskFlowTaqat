import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  GanttChart,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Flag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Task, TaskPriority, TaskStatus, UserProfile } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";
import { isTaskOverdue, formatDate, getTodayDateString } from "@/src/lib/dateUtils";

interface TaskGanttViewProps {
  tasks: Task[];
  isOwner: boolean;
  currentUser: UserProfile;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
}

export const TaskGanttView: React.FC<TaskGanttViewProps> = ({
  tasks,
  isOwner,
  currentUser,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}) => {
  const { t, direction, language } = useLanguage();
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const todayStr = getTodayDateString();

  // Scale: "day" (each column is 1 day) or "week" (each column is 7 days)
  const [scale, setScale] = useState<"day" | "week">("day");
  // Grouping: "all" or "status"
  const [groupBy, setGroupBy] = useState<"all" | "status">("all");

  const columnWidth = scale === "day" ? 44 : 90;

  // Convert task timestamps / ISO strings into Date objects
  const parsedTasks = useMemo(() => {
    return tasks.map((task) => {
      // Determine start date
      let startDate: Date;
      if (task.createdAt) {
        if (typeof (task.createdAt as any).toDate === "function") {
          startDate = (task.createdAt as any).toDate();
        } else {
          startDate = new Date(task.createdAt as string);
        }
      } else {
        startDate = new Date();
      }

      if (isNaN(startDate.getTime())) {
        startDate = new Date();
      }

      // Determine due/end date
      let endDate: Date;
      if (task.dueDate) {
        const parts = task.dueDate.split("T")[0].split("-").map(Number);
        if (parts.length === 3) {
          endDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
          endDate = new Date(task.dueDate);
        }
      } else {
        // Default to startDate + 2 days if no due date
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 2);
      }

      if (isNaN(endDate.getTime())) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 2);
      }

      // Ensure endDate >= startDate (at least 1 day duration for visibility)
      if (endDate < startDate) {
        // If due date was before created date, swap or adjust
        const temp = new Date(endDate);
        endDate = new Date(startDate);
        startDate = temp;
      }

      // Zero-out hours for day calculation
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      // Duration in days (minimum 1 day)
      const diffTime = endDay.getTime() - startDay.getTime();
      const durationDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

      return {
        ...task,
        startDateObj: startDay,
        endDateObj: endDay,
        durationDays,
        isOverdue: isTaskOverdue(task),
      };
    });
  }, [tasks]);

  // Determine global timeline date bounds (earliest start to latest end, padded by 7 days before and 14 days after)
  const { timelineStart, timelineEnd, totalDays, datesArray } = useMemo(() => {
    const today = new Date();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let minDate = new Date(todayDay);
    let maxDate = new Date(todayDay);

    if (parsedTasks.length > 0) {
      parsedTasks.forEach((pt) => {
        if (pt.startDateObj < minDate) minDate = new Date(pt.startDateObj);
        if (pt.endDateObj > maxDate) maxDate = new Date(pt.endDateObj);
      });
    }

    // Pad before and after
    const start = new Date(minDate);
    start.setDate(start.getDate() - (scale === "day" ? 7 : 14));
    // Normalize to Sunday/start of week
    start.setDate(start.getDate() - start.getDay());

    const end = new Date(maxDate);
    end.setDate(end.getDate() + (scale === "day" ? 14 : 28));

    const diff = end.getTime() - start.getTime();
    const daysCount = Math.max(14, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);

    const dates: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      dayName: string;
      isToday: boolean;
      isWeekend: boolean;
      monthYear: string;
    }[] = [];

    const weekdaysAr = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    const weekdaysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayFormatted = String(d.getDate()).padStart(2, "0");
      const dStr = `${y}-${m}-${dayFormatted}`;
      const dayOfWeek = d.getDay();

      dates.push({
        date: d,
        dateStr: dStr,
        dayNumber: d.getDate(),
        dayName: language === "ar" ? weekdaysAr[dayOfWeek] : weekdaysEn[dayOfWeek],
        isToday: dStr === todayStr,
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6, // Fri/Sat in Middle East
        monthYear: d.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
          month: "long",
          year: "numeric",
        }),
      });
    }

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: daysCount,
      datesArray: dates,
    };
  }, [parsedTasks, scale, todayStr, language]);

  // Group months for top timeline header
  const monthGroups = useMemo(() => {
    const groups: { label: string; startIndex: number; count: number }[] = [];
    datesArray.forEach((d, idx) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === d.monthYear) {
        lastGroup.count += 1;
      } else {
        groups.push({
          label: d.monthYear,
          startIndex: idx,
          count: 1,
        });
      }
    });
    return groups;
  }, [datesArray]);

  // Calculate pixel position of a date on timeline
  const getDatePixelOffset = (date: Date): number => {
    const diff = date.getTime() - timelineStart.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return Math.max(0, days * columnWidth);
  };

  // Find index of Today to auto-scroll
  const todayPixelOffset = useMemo(() => {
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return getDatePixelOffset(todayNormalized);
  }, [timelineStart, columnWidth]);

  // Auto-scroll to Today on mount or button click
  const scrollToToday = () => {
    if (timelineScrollRef.current) {
      const containerWidth = timelineScrollRef.current.clientWidth;
      const targetScroll = Math.max(0, todayPixelOffset - containerWidth / 3);
      timelineScrollRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    // Initial center on today after layout
    const timer = setTimeout(() => {
      scrollToToday();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Groups of tasks according to groupBy
  const taskGroups = useMemo(() => {
    if (groupBy === "all") {
      return [{ title: t("allTasksTimeline"), key: "all", items: parsedTasks }];
    }

    const todo = parsedTasks.filter((t) => t.status === "todo");
    const inProgress = parsedTasks.filter((t) => t.status === "in_progress");
    const done = parsedTasks.filter((t) => t.status === "done");

    return [
      { title: t("in_progress"), key: "in_progress", items: inProgress },
      { title: t("todo"), key: "todo", items: todo },
      { title: t("done"), key: "done", items: done },
    ].filter((g) => g.items.length > 0);
  }, [groupBy, parsedTasks, t]);

  // Metrics
  const totalCount = parsedTasks.length;
  const doneCount = parsedTasks.filter((t) => t.status === "done").length;
  const inProgressCount = parsedTasks.filter((t) => t.status === "in_progress").length;
  const overdueCount = parsedTasks.filter((t) => t.isOverdue).length;

  // Task bar color styles
  const getTaskBarStyle = (task: typeof parsedTasks[0]) => {
    if (task.isOverdue) {
      return "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20";
    }
    switch (task.status) {
      case "done":
        return "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20";
      case "in_progress":
        return "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25";
      case "todo":
      default:
        return "bg-slate-600 hover:bg-slate-700 text-white shadow-slate-600/20";
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case "high":
        return "bg-rose-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-emerald-500";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Summary KPIs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
            <GanttChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t("timelineView")}</span>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                ({totalCount} {language === "ar" ? "مهام" : "tasks"})
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("timelineHelp")}
            </p>
          </div>
        </div>

        {/* Center: KPI chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 text-xs font-semibold">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">{t("done")}:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{doneCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">{t("in_progress")}:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{inProgressCount}</span>
          </div>

          {overdueCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-rose-700 dark:text-rose-300 font-bold">
                {overdueCount} {t("overdueTasks")}
              </span>
            </div>
          )}
        </div>

        {/* Right: Controls (Today, Scale, Grouping) */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {/* Jump to Today */}
          <button
            onClick={scrollToToday}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title={t("jumpToToday")}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t("today")}</span>
          </button>

          {/* Scale Switcher (Days / Weeks) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setScale("day")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                scale === "day"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("days")}
            </button>
            <button
              onClick={() => setScale("week")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                scale === "week"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("weeks")}
            </button>
          </div>

          {/* Grouping Toggle */}
          <button
            onClick={() => setGroupBy(groupBy === "all" ? "status" : "all")}
            className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              groupBy === "status"
                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
            title={t("groupByStatus")}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Gantt Timeline Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {parsedTasks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <GanttChart className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {t("noTasksScheduled")}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === "ar"
                ? "ابدأ بإنشاء مهام وتحديد مواعيد استحقاق لها لعرض خطة تسليم المشروع بالكامل."
                : "Create tasks and assign due dates to visualize the full project delivery schedule."}
            </p>
          </div>
        ) : (
          <div className="flex flex-row relative overflow-hidden">
            {/* Left Fixed Tasks Sidebar */}
            <div className="w-40 sm:w-60 md:w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 rtl:border-r-0 rtl:border-l z-20 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
              {/* Header */}
              <div className="h-[68px] border-b border-slate-200 dark:border-slate-800 px-3.5 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t("tasks")}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {parsedTasks.length} {language === "ar" ? "مهمة" : "tasks"}
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {taskGroups.map((group) => (
                  <div key={group.key}>
                    {groupBy !== "all" && (
                      <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/60 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {group.title} ({group.items.length})
                      </div>
                    )}
                    {group.items.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onEditTask(task)}
                        className="h-12 px-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                        title={task.title}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${getPriorityColor(
                              task.priority
                            )}`}
                          />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {task.assigneeName && (
                            <span
                              className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-[8px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              title={task.assigneeName}
                            >
                              {task.assigneeName[0].toUpperCase()}
                            </span>
                          )}
                          <span
                            className={`hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              task.status === "done"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                : task.status === "in_progress"
                                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {t(task.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Scrollable Gantt Timeline */}
            <div
              ref={timelineScrollRef}
              className="flex-1 overflow-x-auto relative select-none"
              style={{ minHeight: "350px" }}
            >
              <div
                style={{
                  width: `${datesArray.length * columnWidth}px`,
                  minWidth: "100%",
                }}
                className="relative"
              >
                {/* TIMELINE HEADER */}
                <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  {/* Top Header: Months */}
                  <div className="flex h-7 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950">
                    {monthGroups.map((mg, i) => (
                      <div
                        key={i}
                        style={{ width: `${mg.count * columnWidth}px` }}
                        className="px-2 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center border-r border-slate-200 dark:border-slate-800 rtl:border-r-0 rtl:border-l truncate"
                      >
                        {mg.label}
                      </div>
                    ))}
                  </div>

                  {/* Bottom Header: Days */}
                  <div className="flex h-10 bg-slate-50/50 dark:bg-slate-950/30">
                    {datesArray.map((d, i) => (
                      <div
                        key={i}
                        style={{ width: `${columnWidth}px` }}
                        className={`shrink-0 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/60 rtl:border-r-0 rtl:border-l text-[10px] font-semibold ${
                          d.isToday
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold"
                            : d.isWeekend
                            ? "bg-slate-100/40 dark:bg-slate-950/50 text-slate-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span className="text-[9px] uppercase opacity-75">{d.dayName}</span>
                        <span className="text-xs">{d.dayNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TIMELINE GRID BODY */}
                <div className="relative">
                  {/* Background Vertical Grid Columns */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {datesArray.map((d, i) => (
                      <div
                        key={i}
                        style={{ width: `${columnWidth}px` }}
                        className={`shrink-0 border-r border-slate-100 dark:border-slate-800/50 rtl:border-r-0 rtl:border-l h-full ${
                          d.isToday
                            ? "bg-indigo-50/20 dark:bg-indigo-950/15"
                            : d.isWeekend
                            ? "bg-slate-50/30 dark:bg-slate-950/30"
                            : ""
                        }`}
                      />
                    ))}
                  </div>

                  {/* Today Vertical Red/Indigo Indicator Marker */}
                  <div
                    style={{ left: `${todayPixelOffset + columnWidth / 2}px` }}
                    className="absolute top-0 bottom-0 z-10 w-0.5 bg-rose-500 pointer-events-none shadow-sm"
                  >
                    <div className="sticky top-[68px] -translate-x-1/2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      {t("today")}
                    </div>
                  </div>

                  {/* Task Bars per Row */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 relative z-5">
                    {taskGroups.map((group) => (
                      <div key={group.key}>
                        {groupBy !== "all" && (
                          <div className="h-7 bg-slate-100/50 dark:bg-slate-800/40" />
                        )}
                        {group.items.map((task) => {
                          const leftOffset = getDatePixelOffset(task.startDateObj);
                          const rightOffset = getDatePixelOffset(task.endDateObj);
                          // Calculate width: at least 1 column width
                          const barWidth = Math.max(
                            columnWidth,
                            rightOffset - leftOffset + columnWidth
                          );

                          return (
                            <div
                              key={task.id}
                              className="h-12 relative flex items-center hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors"
                            >
                              {/* Horizontal Gantt Bar */}
                              <div
                                onClick={() => onEditTask(task)}
                                style={{
                                  left: `${leftOffset}px`,
                                  width: `${barWidth}px`,
                                }}
                                className={`absolute h-7 rounded-lg cursor-pointer transition-all shadow-xs flex items-center px-2.5 gap-2 group hover:scale-[1.01] hover:shadow-md ${getTaskBarStyle(
                                  task
                                )}`}
                                title={`${task.title} (${formatDate(
                                  task.startDateObj.toISOString(),
                                  language as "ar" | "en"
                                )} - ${formatDate(
                                  task.dueDate || task.endDateObj.toISOString(),
                                  language as "ar" | "en"
                                )})`}
                              >
                                {/* Status Icon */}
                                {task.status === "done" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-white" />
                                ) : task.isOverdue ? (
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-white animate-pulse" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 shrink-0 text-white/80" />
                                )}

                                {/* Bar Task Title */}
                                <span className="text-[11px] font-bold truncate flex-1 leading-none">
                                  {task.title}
                                </span>

                                {/* Duration Badge */}
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-black/20 text-white shrink-0">
                                  {task.durationDays} {language === "ar" ? "يوم" : "d"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {language === "ar" ? "دليل الألوان:" : "Color Legend:"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span>{t("done")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-600" />
              <span>{t("in_progress")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-600" />
              <span>{t("todo")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500" />
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                {t("overdueTasks")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {language === "ar"
                ? "انقر على أي شريط مهمة لفتح نافذة التفاصيل أو تعديل الحالة"
                : "Click any task bar to open details or edit status"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
