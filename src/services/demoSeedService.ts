import { Project, UserProfile } from "@/src/types";
import { createProject } from "@/src/services/projectService";
import { createTask } from "@/src/services/taskService";

/**
 * Automatically seeds the suggested demo project from Appendix A of the SRS
 * if the user is a demo owner and has no projects yet.
 */
export async function seedDemoProjectIfEmpty(
  userProfile: UserProfile,
  existingProjects: Project[]
): Promise<void> {
  if (existingProjects.length > 0) return;

  // Only seed if strictly the preset demo account
  if (userProfile.email !== "owner@taskflow.demo") {
    return;
  }

  try {
    const projectId = await createProject(
      "Website Redesign",
      "إعادة تصميم وتطوير الموقع الإلكتروني ومتابعة تقدم الفريق وفق مواصفات SRS",
      userProfile
    );

    // Calculate dates
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, "0")}-${String(nextWeek.getDate()).padStart(2, "0")}`;

    // Task 1: Build navbar (In Progress, High)
    await createTask(
      projectId,
      {
        title: "Build navbar",
        description: "تصميم وتنفيذ شريط التنقل المتجاوب مع دعم اللغتين والوضع الداكن",
        status: "in_progress",
        priority: "high",
        assigneeId: userProfile.uid,
        dueDate: tomorrowStr,
      },
      userProfile
    );

    // Task 2: Create login page (To Do, Medium)
    await createTask(
      projectId,
      {
        title: "Create login page",
        description: "تنفيذ شاشة تسجيل الدخول والمصادقة بكلمة المرور وحساب Google",
        status: "todo",
        priority: "medium",
        assigneeId: userProfile.uid,
        dueDate: nextWeekStr,
      },
      userProfile
    );

    // Task 3: Test responsive layout (Done, Low)
    await createTask(
      projectId,
      {
        title: "Test responsive layout",
        description: "فحص تجاوب الموقع على شاشات الهواتف والأجهزة اللوحية والشاشات العريضة",
        status: "done",
        priority: "low",
        assigneeId: userProfile.uid,
        dueDate: tomorrowStr,
      },
      userProfile
    );

    // Task 4: Fix overdue bug (To Do, High, due yesterday) - SRS Section 18 Live Evaluation requirement!
    await createTask(
      projectId,
      {
        title: "Fix overdue bug",
        description: "مهمة متأخرة عن موعدها لاختبار فلتر المهام المتأخرة وحساب المواعيد بدقة",
        status: "todo",
        priority: "high",
        assigneeId: userProfile.uid,
        dueDate: yesterdayStr,
      },
      userProfile
    );
  } catch (err) {
    console.warn("Demo project seeding skipped or failed:", err);
  }
}
