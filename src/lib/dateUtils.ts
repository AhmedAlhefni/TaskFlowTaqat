import { Task } from "@/src/types";

/**
 * Returns today's calendar date as YYYY-MM-DD in the local timezone.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a task is overdue based on the calendar-day rule:
 * - Has non-null dueDate
 * - dueDate is strictly before today's calendar date (YYYY-MM-DD < today)
 * - Status is NOT 'done'
 */
export function isTaskOverdue(task: Task | { dueDate: string | null; status: string }): boolean {
  if (!task.dueDate) return false;
  if (task.status === "done") return false;

  const todayStr = getTodayDateString();
  const taskDueDate = task.dueDate.split("T")[0]; // sanitize if ISO timestamp
  return taskDueDate < todayStr;
}

/**
 * Formats a date string nicely according to the locale.
 */
export function formatDate(dateString: string | null, locale: "ar" | "en" = "ar"): string {
  if (!dateString) return locale === "ar" ? "غير محدد" : "No deadline";
  try {
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats relative or readable time from a timestamp.
 */
export function formatTimestamp(timestamp: any, locale: "ar" | "en" = "ar"): string {
  if (!timestamp) return "";
  let date: Date;
  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return "";

  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
