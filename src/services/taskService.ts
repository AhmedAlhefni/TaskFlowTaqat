import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Task, TaskStatus, TaskPriority, UserProfile } from "@/src/types";
import { getProject } from "@/src/services/projectService";
import { logActivity } from "@/src/services/activityService";
import { localStore } from "@/src/services/localStore";

/**
 * Real-time listener for tasks in a project after access has been confirmed.
 */
export const subscribeProjectTasks = (
  projectId: string,
  onTasksUpdated: (tasks: Task[]) => void,
  onError?: (err: any) => void
) => {
  // Do not display cached task data until Firestore confirms the project access.
  onTasksUpdated([]);
  let serverConfirmedAccess = false;
  const localEvent = `taskflow_local_tasks_${projectId}`;
  const handleLocalChange = () => {
    if (serverConfirmedAccess) onTasksUpdated(localStore.getTasks(projectId));
  };
  window.addEventListener(localEvent, handleLocalChange);

  try {
    const tasksRef = collection(db, "projects", projectId, "tasks");

    const unsubscribe = onSnapshot(
      tasksRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.fromCache) {
          serverConfirmedAccess = false;
          onTasksUpdated([]);
          return;
        }

        const tasks: Task[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Task[];

        serverConfirmedAccess = true;
        localStore.saveProjectTasks(projectId, tasks);
        onTasksUpdated(tasks);
      },
      (err) => {
        serverConfirmedAccess = false;
        if (err.code === "permission-denied") {
          window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
        }
        onTasksUpdated([]);
        onError?.(err);
      }
    );

    return () => {
      unsubscribe();
      window.removeEventListener(localEvent, handleLocalChange);
    };
  } catch (error) {
    serverConfirmedAccess = false;
    window.removeEventListener(localEvent, handleLocalChange);
    onTasksUpdated([]);
    onError?.(error);
    return () => {};
  }
};

export const getTask = async (projectId: string, taskId: string): Promise<Task | null> => {
  // 1. Instant local lookup
  const localTasks = localStore.getTasks(projectId);
  const localTask = localTasks.find((t) => t.id === taskId);
  if (localTask) return localTask;

  try {
    const taskRef = doc(db, "projects", projectId, "tasks", taskId);
    const snap = await getDoc(taskRef);
    if (snap.exists()) {
      const remoteTask = { id: snap.id, ...snap.data() } as Task;
      localStore.saveTask(remoteTask);
      return remoteTask;
    }
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
    }
  }

  return null;
};

/**
 * Create a new task (Owner or Member).
 */
export const createTask = async (
  projectId: string,
  data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
  },
  currentUser: UserProfile
): Promise<string> => {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const isOwner = project.ownerId === currentUser.uid;
  if (!isOwner && !project.memberIds.includes(currentUser.uid)) {
    throw new Error("Unauthorized: You must be a member of this project to create tasks");
  }

  const trimmedTitle = data.title.trim();
  if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
    throw new Error("Task title must be between 3 and 120 characters");
  }

  const trimmedDesc = (data.description || "").trim();
  if (trimmedDesc.length > 1000) {
    throw new Error("Task description cannot exceed 1000 characters");
  }

  let assigneeName: string | null = null;
  let assigneeEmail: string | null = null;
  if (data.assigneeId) {
    if (!project.memberIds.includes(data.assigneeId)) {
      throw new Error("Assignee must be an active member of this project");
    }
    const memberInfo = project.members?.[data.assigneeId];
    assigneeName = memberInfo?.displayName || null;
    assigneeEmail = memberInfo?.email || null;
  }

  const generatedTaskId = "task_" + Math.random().toString(36).substring(2, 10);
  const newTask: Task = {
    id: generatedTaskId,
    projectId,
    title: trimmedTitle,
    description: trimmedDesc,
    status: data.status || "todo",
    priority: data.priority || "medium",
    assigneeId: data.assigneeId || null,
    assigneeName,
    assigneeEmail,
    createdBy: currentUser.uid,
    creatorName: currentUser.displayName,
    dueDate: data.dueDate ? data.dueDate.split("T")[0] : null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Try Firestore first
  try {
    const taskRef = doc(db, "projects", projectId, "tasks", generatedTaskId);
    await setDoc(taskRef, {
      ...newTask,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("فشل الحفظ: تم رفض إنشاء المهمة من قِبل قواعد أمان Firestore (Permission Denied).");
    }
    throw new Error(`فشل حفظ المهمة في السحابة: ${err.message || "تعذر الاتصال بـ Firestore السحابي (تحقق من اتصال الإنترنت)."}`);
  }

  // 2. Save locally only after successful remote persistence
  localStore.saveTask(newTask);

  logActivity(
    projectId,
    currentUser.uid,
    currentUser.displayName,
    "task_created",
    "task",
    generatedTaskId,
    `Created task "${trimmedTitle}"`,
    { taskTitle: trimmedTitle }
  ).catch((e) => console.warn("Activity logging failed in background:", e));

  return generatedTaskId;
};

/**
 * Update task details (Owner, Task Creator, or Assignee) with atomic optimistic concurrency control.
 */
export const updateTask = async (
  projectId: string,
  taskId: string,
  data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
    status?: TaskStatus;
  },
  currentUser: UserProfile,
  expectedVersion?: number
): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const task = await getTask(projectId, taskId);
  if (!task) throw new Error("Task not found");

  const isOwner = project.ownerId === currentUser.uid;
  const isCreator = task.createdBy === currentUser.uid;
  const isAssignee = task.assigneeId === currentUser.uid;

  if (!isOwner && !isCreator && !isAssignee) {
    throw new Error("notAuthorizedToEdit");
  }

  // Changing status is restricted to Owner or Assignee only (SRS FR-06)
  const isStatusChanged = data.status !== undefined && data.status !== task.status;
  if (isStatusChanged && !isOwner && !isAssignee) {
    throw new Error("notAuthorizedToChangeStatus");
  }

  const trimmedTitle = data.title.trim();
  if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
    throw new Error("Task title must be between 3 and 120 characters");
  }

  const trimmedDesc = (data.description || "").trim();
  if (trimmedDesc.length > 1000) {
    throw new Error("Task description cannot exceed 1000 characters");
  }

  let assigneeName = task.assigneeName;
  let assigneeEmail = task.assigneeEmail;
  if (data.assigneeId !== undefined) {
    if (data.assigneeId === null) {
      assigneeName = null;
      assigneeEmail = null;
    } else {
      if (!project.memberIds.includes(data.assigneeId)) {
        throw new Error("Assignee must be an active member of this project");
      }
      const memberInfo = project.members?.[data.assigneeId];
      assigneeName = memberInfo?.displayName || null;
      assigneeEmail = memberInfo?.email || null;
    }
  }

  const finalPriority = data.priority || task.priority;
  const finalAssigneeId = data.assigneeId !== undefined ? data.assigneeId : task.assigneeId;
  const finalDueDate = data.dueDate !== undefined ? (data.dueDate ? data.dueDate.split("T")[0] : null) : task.dueDate;
  const finalStatus = data.status !== undefined ? data.status : task.status;

  let finalVersion = (expectedVersion || 1) + 1;
  let remoteTransactionSucceeded = false;

  // 1. Atomic Firestore transaction
  try {
    const taskRef = doc(db, "projects", projectId, "tasks", taskId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(taskRef);
      if (!snap.exists()) {
        throw new Error("Task not found");
      }

      const remoteData = snap.data();
      const remoteIsOwner = project.ownerId === currentUser.uid;
      const remoteIsCreator = remoteData.createdBy === currentUser.uid;
      const remoteIsAssignee = remoteData.assigneeId === currentUser.uid;

      if (!remoteIsOwner && !remoteIsCreator && !remoteIsAssignee) {
        throw new Error("notAuthorizedToEdit");
      }

      const remoteStatusChanged = data.status !== undefined && data.status !== remoteData.status;
      if (remoteStatusChanged && !remoteIsOwner && !remoteIsAssignee) {
        throw new Error("notAuthorizedToChangeStatus");
      }

      const currentVersion = typeof remoteData.version === "number" ? remoteData.version : 1;
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        const conflictErr = new Error("CONCURRENCY_CONFLICT: This task was modified by another user.");
        (conflictErr as any).code = "CONCURRENCY_CONFLICT";
        (conflictErr as any).currentVersion = currentVersion;
        throw conflictErr;
      }

      finalVersion = currentVersion + 1;
      transaction.update(taskRef, {
        title: trimmedTitle,
        description: trimmedDesc,
        status: finalStatus,
        priority: finalPriority,
        assigneeId: finalAssigneeId,
        assigneeName,
        assigneeEmail,
        dueDate: finalDueDate,
        version: finalVersion,
        updatedAt: serverTimestamp(),
      });
    });
    remoteTransactionSucceeded = true;
  } catch (err: any) {
    if (err.code === "CONCURRENCY_CONFLICT" || err.message?.includes("CONCURRENCY_CONFLICT")) {
      // Do NOT overwrite localStore or retry on stale version!
      throw err;
    }
    if (
      err.message === "notAuthorizedToEdit" ||
      err.message === "notAuthorizedToChangeStatus" ||
      err.message?.includes("Unauthorized")
    ) {
      throw err;
    }
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("فشل التعديل: تم رفض تعديل المهمة بواسطة قواعد أمان Firestore (Permission Denied).");
    }
    // If running in local fallback / offline mode
    if (!remoteTransactionSucceeded) {
      if (err.message && !err.message.includes("offline")) {
        throw new Error(`فشل تحديث المهمة في السحابة: ${err.message}`);
      }
      window.dispatchEvent(
        new CustomEvent("taskflow_offline_sync_warning", {
          detail: {
            message: "تنبيه: تعذر الاتصال بـ Firestore السحابي. تم حفظ تعديل المهمة محلياً فقط ولم يُحفظ في السحابة.",
          },
        })
      );
      const local = localStore.getTasks(projectId).find((t) => t.id === taskId);
      if (local) {
        const localVersion = local.version || 1;
        if (expectedVersion !== undefined && localVersion !== expectedVersion) {
          const conflictErr = new Error("CONCURRENCY_CONFLICT: This task was modified by another user.");
          (conflictErr as any).code = "CONCURRENCY_CONFLICT";
          (conflictErr as any).currentVersion = localVersion;
          throw conflictErr;
        }
        finalVersion = localVersion + 1;
      }
    }
  }

  // 2. Update localStore only after successful validation / atomic transaction
  const currentLocal = localStore.getTasks(projectId).find((t) => t.id === taskId) || task;
  const updated: Task = {
    ...currentLocal,
    title: trimmedTitle,
    description: trimmedDesc,
    status: finalStatus,
    priority: finalPriority,
    assigneeId: finalAssigneeId,
    assigneeName,
    assigneeEmail,
    dueDate: finalDueDate,
    version: finalVersion,
    updatedAt: new Date().toISOString(),
  };

  localStore.saveTask(updated);

  const isReassigned = data.assigneeId !== undefined && data.assigneeId !== task.assigneeId;

  if (isReassigned) {
    const prevName = task.assigneeName || (task.assigneeId ? "Member" : "Unassigned");
    const nextName = assigneeName || (data.assigneeId ? "Member" : "Unassigned");
    logActivity(
      projectId,
      currentUser.uid,
      currentUser.displayName,
      "task_reassigned",
      "task",
      taskId,
      `${currentUser.displayName} reassigned "${trimmedTitle}" from ${prevName} to ${nextName}`,
      {
        taskTitle: trimmedTitle,
        previousAssigneeId: task.assigneeId || null,
        previousAssigneeName: prevName,
        newAssigneeId: data.assigneeId || null,
        newAssigneeName: nextName,
      }
    ).catch((e) => console.warn("Activity logging failed in background:", e));
  } else {
    logActivity(
      projectId,
      currentUser.uid,
      currentUser.displayName,
      "task_updated",
      "task",
      taskId,
      `Updated task "${trimmedTitle}"`,
      { taskTitle: trimmedTitle }
    ).catch((e) => console.warn("Activity logging failed in background:", e));
  }

  if (isStatusChanged) {
    logActivity(
      projectId,
      currentUser.uid,
      currentUser.displayName,
      "task_status_changed",
      "task",
      taskId,
      `Changed task "${trimmedTitle}" status to ${finalStatus}`,
      {
        taskTitle: trimmedTitle,
        oldStatus: task.status,
        newStatus: finalStatus,
      }
    ).catch((e) => console.warn("Activity logging failed in background:", e));
  }
};

/**
 * Update task status (Owner or Assigned Member ONLY!) with atomic optimistic concurrency control.
 */
export const updateTaskStatus = async (
  projectId: string,
  taskId: string,
  newStatus: TaskStatus,
  currentUser: UserProfile,
  expectedVersion?: number
): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const task = await getTask(projectId, taskId);
  if (!task) throw new Error("Task not found");

  const isOwner = project.ownerId === currentUser.uid;
  const isAssignee = task.assigneeId === currentUser.uid;

  if (!isOwner && !isAssignee) {
    throw new Error("notAuthorizedToChangeStatus");
  }

  let finalVersion = (expectedVersion || 1) + 1;
  let remoteTransactionSucceeded = false;

  // 1. Atomic Firestore transaction
  try {
    const taskRef = doc(db, "projects", projectId, "tasks", taskId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(taskRef);
      if (!snap.exists()) {
        throw new Error("Task not found");
      }

      const remoteData = snap.data();
      const remoteIsOwner = project.ownerId === currentUser.uid;
      const remoteIsAssignee = remoteData.assigneeId === currentUser.uid;

      if (!remoteIsOwner && !remoteIsAssignee) {
        throw new Error("notAuthorizedToChangeStatus");
      }

      const currentVersion = typeof remoteData.version === "number" ? remoteData.version : 1;
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        const conflictErr = new Error("CONCURRENCY_CONFLICT: This task was modified by another user.");
        (conflictErr as any).code = "CONCURRENCY_CONFLICT";
        (conflictErr as any).currentVersion = currentVersion;
        throw conflictErr;
      }

      finalVersion = currentVersion + 1;
      transaction.update(taskRef, {
        status: newStatus,
        version: finalVersion,
        updatedAt: serverTimestamp(),
      });
    });
    remoteTransactionSucceeded = true;
  } catch (err: any) {
    if (err.code === "CONCURRENCY_CONFLICT" || err.message?.includes("CONCURRENCY_CONFLICT")) {
      // Do NOT overwrite localStore or retry on stale version!
      throw err;
    }
    if (err.message === "notAuthorizedToChangeStatus" || err.message?.includes("Unauthorized")) {
      throw err;
    }
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("فشل تغيير الحالة: تم رفض التعديل بواسطة قواعد أمان Firestore (Permission Denied).");
    }
    // Local fallback / offline mode
    if (!remoteTransactionSucceeded) {
      if (err.message && !err.message.includes("offline")) {
        throw new Error(`فشل تحديث حالة المهمة في السحابة: ${err.message}`);
      }
      window.dispatchEvent(
        new CustomEvent("taskflow_offline_sync_warning", {
          detail: {
            message: "تنبيه: تعذر الاتصال بـ Firestore السحابي. تم تحديث حالة المهمة محلياً فقط ولم تُحفظ في السحابة.",
          },
        })
      );
      const local = localStore.getTasks(projectId).find((t) => t.id === taskId);
      if (local) {
        const localVersion = local.version || 1;
        if (expectedVersion !== undefined && localVersion !== expectedVersion) {
          const conflictErr = new Error("CONCURRENCY_CONFLICT: This task was modified by another user.");
          (conflictErr as any).code = "CONCURRENCY_CONFLICT";
          (conflictErr as any).currentVersion = localVersion;
          throw conflictErr;
        }
        finalVersion = localVersion + 1;
      }
    }
  }

  // 2. Update localStore only after successful atomic update
  const currentLocal = localStore.getTasks(projectId).find((t) => t.id === taskId) || task;
  const updated: Task = {
    ...currentLocal,
    status: newStatus,
    version: finalVersion,
    updatedAt: new Date().toISOString(),
  };

  localStore.saveTask(updated);

  logActivity(
    projectId,
    currentUser.uid,
    currentUser.displayName,
    "task_status_changed",
    "task",
    taskId,
    `Changed task "${task.title}" status to ${newStatus}`,
    {
      taskTitle: task.title,
      oldStatus: task.status,
      newStatus,
    }
  ).catch((e) => console.warn("Activity logging failed in background:", e));
};

/**
 * Delete task (Owner or Task Creator ONLY!).
 */
export const deleteTask = async (
  projectId: string,
  taskId: string,
  currentUser: UserProfile
): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const task = await getTask(projectId, taskId);
  if (!task) throw new Error("Task not found");

  const isOwner = project.ownerId === currentUser.uid;
  const isCreator = task.createdBy === currentUser.uid;

  if (!isOwner && !isCreator) {
    throw new Error("notAuthorizedToDelete");
  }

  try {
    const taskRef = doc(db, "projects", projectId, "tasks", taskId);
    await deleteDoc(taskRef);
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("فشل الحذف: ليس لديك صلاحية حذف هذه المهمة من السحابة (Permission Denied).");
    }
    if (err.message && !err.message.includes("not found")) {
      throw new Error(`فشل حذف المهمة من السحابة: ${err.message || "تعذر الاتصال بخادم Firestore"}`);
    }
  }

  // Delete locally only after Firestore delete succeeds
  localStore.deleteTask(projectId, taskId);

  logActivity(
    projectId,
    currentUser.uid,
    currentUser.displayName,
    "task_deleted",
    "task",
    taskId,
    `Deleted task "${task.title}"`,
    { taskTitle: task.title }
  ).catch((e) => console.warn("Activity logging failed in background:", e));
};
