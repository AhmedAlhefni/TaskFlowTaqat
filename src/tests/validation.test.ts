import { describe, it, expect } from "vitest";
import { isTaskOverdue, getTodayDateString, formatDate } from "@/src/lib/dateUtils";

describe("Validation and Date Utilities", () => {
  it("correctly identifies overdue tasks based on calendar date", () => {
    const today = getTodayDateString();
    
    // Yesterday's date
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split("T")[0];

    // Tomorrow's date
    const dTomorrow = new Date();
    dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomorrow = dTomorrow.toISOString().split("T")[0];

    // Overdue task: past dueDate and status !== 'done'
    expect(isTaskOverdue({ dueDate: yesterday, status: "todo" })).toBe(true);
    expect(isTaskOverdue({ dueDate: yesterday, status: "in_progress" })).toBe(true);

    // Completed task should never be considered overdue
    expect(isTaskOverdue({ dueDate: yesterday, status: "done" })).toBe(false);

    // Task due today or in the future is not overdue
    expect(isTaskOverdue({ dueDate: today, status: "todo" })).toBe(false);
    expect(isTaskOverdue({ dueDate: tomorrow, status: "todo" })).toBe(false);

    // Task without a deadline is never overdue
    expect(isTaskOverdue({ dueDate: null, status: "todo" })).toBe(false);
  });

  it("formats dates gracefully across Arabic and English locales", () => {
    expect(formatDate(null, "ar")).toBe("غير محدد");
    expect(formatDate(null, "en")).toBe("No deadline");

    const dateStr = "2026-10-18";
    const formattedAr = formatDate(dateStr, "ar");
    const formattedEn = formatDate(dateStr, "en");

    expect(formattedAr).toBeTruthy();
    expect(formattedEn).toContain("2026");
  });
});
