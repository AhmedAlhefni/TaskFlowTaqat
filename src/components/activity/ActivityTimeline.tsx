import React from "react";
import {
  History,
  CheckCircle2,
  UserPlus,
  UserMinus,
  Edit,
  PlusCircle,
  Trash2,
  FolderPlus,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckSquare,
  Folder,
  User,
  Activity as ActivityIcon,
} from "lucide-react";
import { Activity, ActivityAction, TaskStatus } from "@/src/types";
import { formatTimestamp } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";

interface ActivityTimelineProps {
  activities: Activity[];
  isLoading?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  isLoading = false,
}) => {
  const { t, language, direction } = useLanguage();
  const isAr = language === "ar";

  const getActionConfig = (action: ActivityAction) => {
    switch (action) {
      case "project_created":
        return {
          icon: <FolderPlus className="w-4 h-4 text-indigo-500" />,
          badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900",
          title: isAr ? "إنشاء مشروع" : "Project Created",
        };
      case "project_updated":
        return {
          icon: <Edit className="w-4 h-4 text-indigo-500" />,
          badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900",
          title: isAr ? "تعديل مشروع" : "Project Updated",
        };
      case "member_added":
        return {
          icon: <UserPlus className="w-4 h-4 text-emerald-500" />,
          badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
          title: isAr ? "إضافة عضو" : "Member Added",
        };
      case "member_removed":
        return {
          icon: <UserMinus className="w-4 h-4 text-rose-500" />,
          badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900",
          title: isAr ? "إزالة عضو" : "Member Removed",
        };
      case "task_created":
        return {
          icon: <PlusCircle className="w-4 h-4 text-blue-500" />,
          badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900",
          title: isAr ? "إنشاء مهمة" : "Task Created",
        };
      case "task_updated":
        return {
          icon: <Edit className="w-4 h-4 text-amber-500" />,
          badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900",
          title: isAr ? "تعديل مهمة" : "Task Updated",
        };
      case "task_reassigned":
        return {
          icon: <UserPlus className="w-4 h-4 text-violet-500" />,
          badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-900",
          title: isAr ? "إعادة إسناد" : "Task Reassigned",
        };
      case "task_status_changed":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
          title: isAr ? "تغيير حالة" : "Status Changed",
        };
      case "task_deleted":
        return {
          icon: <Trash2 className="w-4 h-4 text-rose-500" />,
          badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900",
          title: isAr ? "حذف مهمة" : "Task Deleted",
        };
      default:
        return {
          icon: <History className="w-4 h-4 text-slate-500" />,
          badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
          title: isAr ? "سجل نشاط" : "Activity",
        };
    }
  };

  const getStatusBadge = (statusKey: string) => {
    const isDone = statusKey === "done";
    const isInProgress = statusKey === "in_progress";
    const label =
      statusKey === "done"
        ? t("done")
        : statusKey === "in_progress"
        ? t("in_progress")
        : t("todo");

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shrink-0 ${
          isDone
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            : isInProgress
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isDone ? "bg-emerald-500" : isInProgress ? "bg-blue-500" : "bg-slate-400"
          }`}
        />
        <span>{label}</span>
      </span>
    );
  };

  // Helper to extract quoted phrases from legacy English summary
  const extractQuoted = (text?: string) => text?.match(/"([^"]+)"/)?.[1] || "";

  /**
   * Renders the structured activity content with 100% bidirectional isolation.
   * Every dynamic English/Arabic string is contained in its own isolated element,
   * avoiding any punctuation jumping, flipped quotes, or disordered text flows.
   */
  const renderActivityDetails = (act: Activity) => {
    const meta = act.metadata || {};

    // Helper: Safely isolated pill for entity titles (Task name, Project name)
    const renderEntityPill = (val: string, icon: React.ReactNode, isDeleted = false) => (
      <span
        dir="auto"
        style={{ unicodeBidi: "isolate" }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border max-w-full ${
          isDeleted
            ? "bg-rose-50/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900 line-through"
            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200/90 dark:border-slate-700 shadow-2xs"
        }`}
      >
        <span className="shrink-0 opacity-70">{icon}</span>
        <bdi dir="auto" className="truncate select-all" style={{ unicodeBidi: "isolate" }}>
          {val}
        </bdi>
      </span>
    );

    // Helper: Safely isolated pill for user/member names
    const renderUserPill = (name: string, email?: string) => (
      <span
        dir="auto"
        style={{ unicodeBidi: "isolate" }}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700"
      >
        <User className="w-3 h-3 text-slate-400 shrink-0" />
        <bdi dir="auto" style={{ unicodeBidi: "isolate" }}>
          {name}
        </bdi>
        {email && (
          <span dir="ltr" className="text-[10px] text-slate-400 font-mono font-normal">
            ({email})
          </span>
        )}
      </span>
    );

    switch (act.action) {
      case "project_created": {
        const pName = meta.projectName || extractQuoted(act.summary) || act.entityId;
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "أنشأ مساحة العمل الجديدة:" : "created new workspace:"}
              </span>
              {renderEntityPill(pName, <Folder className="w-3.5 h-3.5 text-indigo-500" />)}
            </div>
          </div>
        );
      }

      case "project_updated": {
        const pName = meta.projectName || extractQuoted(act.summary) || act.entityId;
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "عدّل بيانات مساحة العمل إلى:" : "updated workspace details:"}
              </span>
              {renderEntityPill(pName, <Folder className="w-3.5 h-3.5 text-indigo-500" />)}
            </div>
          </div>
        );
      }

      case "member_added": {
        const memberName =
          meta.memberName ||
          meta.memberEmail ||
          act.summary?.replace(/^Added\s+/i, "")?.replace(/\s+to project$/i, "") ||
          act.entityId;
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "أضاف العضو إلى الفريق:" : "added team member:"}
              </span>
              {renderUserPill(memberName, meta.memberEmail)}
            </div>
          </div>
        );
      }

      case "member_removed": {
        const memberName =
          meta.memberName ||
          act.summary?.replace(/^Removed\s+/i, "")?.replace(/\s+from project.*$/i, "") ||
          act.entityId;
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "أزال العضو من الفريق:" : "removed member from project:"}
              </span>
              {renderUserPill(memberName)}
            </div>
          </div>
        );
      }

      case "task_created": {
        const title = meta.taskTitle || extractQuoted(act.summary) || act.entityId;
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "أنشأ مهمة جديدة بعنوان:" : "created a new task:"}
              </span>
              {renderEntityPill(title, <CheckSquare className="w-3.5 h-3.5 text-blue-500" />)}
            </div>
          </div>
        );
      }

      case "task_updated": {
        const title = meta.taskTitle || extractQuoted(act.summary) || act.entityId;
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "حدّث تفاصيل المهمة:" : "updated task details:"}
              </span>
              {renderEntityPill(title, <CheckSquare className="w-3.5 h-3.5 text-amber-500" />)}
            </div>
          </div>
        );
      }

      case "task_status_changed": {
        const title = meta.taskTitle || extractQuoted(act.summary) || act.entityId;
        let newStatus = meta.newStatus;
        if (!newStatus && act.summary) {
          const match = act.summary.match(/status to (\w+)/i);
          if (match) newStatus = match[1].toLowerCase() as TaskStatus;
        }

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "غيّر حالة المهمة:" : "changed status of task:"}
              </span>
              {renderEntityPill(title, <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />)}
            </div>

            {/* Visual Status Transition */}
            {newStatus && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">
                  {isAr ? "الحالة الجديدة:" : "New status:"}
                </span>
                {getStatusBadge(newStatus)}
              </div>
            )}
          </div>
        );
      }

      case "task_reassigned": {
        const title = meta.taskTitle || extractQuoted(act.summary) || act.entityId;
        const unassignedText = isAr ? "غير مسندة" : "Unassigned";
        const prev = meta.previousAssigneeName || unassignedText;
        const next = meta.newAssigneeName || unassignedText;

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "أعاد إسناد المهمة:" : "reassigned task:"}
              </span>
              {renderEntityPill(title, <CheckSquare className="w-3.5 h-3.5 text-violet-500" />)}
            </div>

            {/* Visual Reassignment Flow */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
              <span className="text-slate-400">{isAr ? "من:" : "From:"}</span>
              {renderUserPill(prev)}
              {direction === "rtl" ? (
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="text-slate-400">{isAr ? "إلى:" : "To:"}</span>
              {renderUserPill(next)}
            </div>
          </div>
        );
      }

      case "task_deleted": {
        const title = meta.taskTitle || extractQuoted(act.summary) || act.entityId;
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">
                {isAr ? "قام بحذف المهمة:" : "deleted task:"}
              </span>
              {renderEntityPill(title, <Trash2 className="w-3.5 h-3.5 text-rose-500" />, true)}
            </div>
          </div>
        );
      }

      default: {
        // Fallback for custom or legacy activity strings
        // If summary matches known patterns, localize gracefully
        let localizedText = act.summary;
        if (isAr && act.summary) {
          if (act.summary.startsWith("Created task")) {
            localizedText = act.summary.replace("Created task", "أنشأ المهمة");
          } else if (act.summary.startsWith("Updated task")) {
            localizedText = act.summary.replace("Updated task", "حدّث المهمة");
          } else if (act.summary.startsWith("Deleted task")) {
            localizedText = act.summary.replace("Deleted task", "حذف المهمة");
          } else if (act.summary.startsWith("Created project")) {
            localizedText = act.summary.replace("Created project", "أنشأ المشروع");
          } else if (act.summary.startsWith("Added") && act.summary.includes("to project")) {
            localizedText = act.summary
              .replace("Added", "أضاف العضو")
              .replace("to project", "إلى المشروع");
          }
        }

        return (
          <div
            dir="auto"
            style={{ unicodeBidi: "isolate" }}
            className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium"
          >
            <bdi dir="auto" style={{ unicodeBidi: "isolate" }}>
              {localizedText}
            </bdi>
          </div>
        );
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xs">
        <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-xs font-semibold text-slate-400">{t("loading")}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <History className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {t("noActivitiesYet")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t("activityLog")}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {activities.length} {isAr ? "عملية مسجلة ومرتبة بدقة" : "logged actions"}
            </span>
          </div>
        </div>
      </div>

      {/* Structured Timeline Feed */}
      <div className="relative ps-6 sm:ps-8 space-y-4 before:absolute before:start-2.5 sm:before:start-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {activities.map((act) => {
          const config = getActionConfig(act.action);
          const actorInitials = act.actorName
            ? act.actorName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "U";

          return (
            <div key={act.id} className="relative group">
              {/* Timeline Icon Node */}
              <div className="absolute -start-6 sm:-start-8 top-3 w-7 h-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs transition-transform group-hover:scale-110 z-10">
                {config.icon}
              </div>

              {/* Timeline Entry Card with Structured Isolated Elements */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs hover:shadow-xs flex flex-col gap-3">
                {/* Top Row: Action Badge + Actor + Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/50 dark:border-slate-700/40">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Action Type Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${config.badgeClass}`}
                    >
                      <span>{config.title}</span>
                    </span>

                    {/* Actor Chip with Strict BiDi Isolation */}
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {actorInitials}
                      </div>
                      <bdi
                        dir="auto"
                        style={{ unicodeBidi: "isolate" }}
                        className="text-xs font-bold text-slate-900 dark:text-white"
                      >
                        {act.actorName}
                      </bdi>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <time>{formatTimestamp(act.createdAt, language)}</time>
                  </div>
                </div>

                {/* Details Row: Entities and values strictly isolated from BiDi collisions */}
                <div className="pt-0.5">{renderActivityDetails(act)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
