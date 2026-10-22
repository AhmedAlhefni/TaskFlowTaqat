import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  runTransaction,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Project, UserProfile } from "@/src/types";
import { logActivity } from "@/src/services/activityService";
import { localStore } from "@/src/services/localStore";

/**
 * Real-time subscription to projects where Firestore confirms current membership.
 */
export const subscribeUserProjects = (
  userId: string,
  onProjectsUpdated: (projects: Project[], serverConfirmed?: boolean) => void,
  onError?: (err: any) => void
) => {
  try {
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("memberIds", "array-contains", userId));

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Cached membership can be stale after an owner removes this user.
        // Fail closed until Firestore confirms the current membership list.
        if (snapshot.metadata.fromCache) {
          onProjectsUpdated([], false);
          return;
        }

        const projects: Project[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Project[];
        // Sort client-side by updatedAt/createdAt descending
        projects.sort((a, b) => {
          const timeA = new Date((a.updatedAt as any)?.toDate?.() || a.updatedAt || 0).getTime();
          const timeB = new Date((b.updatedAt as any)?.toDate?.() || b.updatedAt || 0).getTime();
          return timeB - timeA;
        });

        localStore.reconcileProjectsForUser(userId, projects);
        projects.forEach((p) => localStore.saveProject(p));
        onProjectsUpdated(projects, true);
      },
      (err) => {
        if (err.code === "permission-denied") {
          window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
        }
        onProjectsUpdated([], false);
        onError?.(err);
      }
    );

    return unsubscribe;
  } catch (error) {
    onProjectsUpdated([], false);
    onError?.(error);
    return () => {};
  }
};

/**
 * Fetch a single project by ID.
 */
export const getProject = async (projectId: string): Promise<Project | null> => {
  // 1. Instant local lookup for active projects
  const local = localStore.getProject(projectId);
  if (local) return local;

  try {
    const docRef = doc(db, "projects", projectId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const p = { id: snap.id, ...snap.data() } as Project;
      localStore.saveProject(p);
      return p;
    }
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
    }
  }

  return null;
};

/**
 * Create a new project.
 */
export const createProject = async (
  name: string,
  description: string,
  currentUser: UserProfile
): Promise<string> => {
  const trimmedName = name.trim();
  const trimmedDesc = description.trim();

  if (trimmedName.length < 3 || trimmedName.length > 80) {
    throw new Error("Project name must be between 3 and 80 characters");
  }
  if (trimmedDesc.length > 1000) {
    throw new Error("Project description cannot exceed 1000 characters");
  }

  const generatedId = "proj_" + Math.random().toString(36).substring(2, 10);
  const newProjectData: Project = {
    id: generatedId,
    name: trimmedName,
    description: trimmedDesc,
    ownerId: currentUser.uid,
    memberIds: [currentUser.uid],
    members: {
      [currentUser.uid]: {
        email: currentUser.email,
        displayName: currentUser.displayName,
      },
    },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Try to sync to Firestore first
  try {
    const projectRef = doc(db, "projects", generatedId);
    await setDoc(projectRef, {
      ...newProjectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("فشل الحفظ: تم رفض إنشاء المشروع بواسطة قواعد أمان Firestore (Permission Denied).");
    }
    throw new Error(`فشل حفظ المشروع في السحابة: ${err.message || "تعذر الاتصال بخادم Firestore السحابي (تحقق من اتصال الإنترنت)."}`);
  }

  // 2. Save in local store only after successful Firestore save
  localStore.saveProject(newProjectData);

  // Log activity in background without blocking response
  logActivity(
    generatedId,
    currentUser.uid,
    currentUser.displayName,
    "project_created",
    "project",
    generatedId,
    `Project "${trimmedName}" was created`,
    { projectName: trimmedName }
  ).catch((e) => console.warn("Activity logging failed in background:", e));

  return generatedId;
};

/**
/**
 * Update project (Owner only) with atomic optimistic concurrency control.
 */
export const updateProject = async (
  projectId: string,
  name: string,
  description: string,
  currentUser: UserProfile,
  expectedVersion?: number
): Promise<void> => {
  const trimmedName = name.trim();
  const trimmedDesc = description.trim();

  if (trimmedName.length < 3 || trimmedName.length > 80) {
    throw new Error("Project name must be between 3 and 80 characters");
  }
  if (trimmedDesc.length > 1000) {
    throw new Error("Project description cannot exceed 1000 characters");
  }

  let finalVersion = (expectedVersion || 1) + 1;
  let remoteTransactionSucceeded = false;

  // 1. Atomic Firestore transaction
  try {
    const docRef = doc(db, "projects", projectId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) {
        throw new Error("Project not found");
      }

      const remoteData = snap.data();
      if (remoteData.ownerId !== currentUser.uid) {
        throw new Error("Unauthorized: Only the project owner can update project details");
      }

      const currentVersion = typeof remoteData.version === "number" ? remoteData.version : 1;
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        const conflictErr = new Error("CONCURRENCY_CONFLICT: The project was updated by someone else.");
        (conflictErr as any).code = "CONCURRENCY_CONFLICT";
        (conflictErr as any).currentVersion = currentVersion;
        throw conflictErr;
      }

      finalVersion = currentVersion + 1;
      transaction.update(docRef, {
        name: trimmedName,
        description: trimmedDesc,
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
    if (err.message?.includes("Unauthorized")) {
      throw err;
    }
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("فشل التعديل: ليس لديك صلاحية تعديل هذا المشروع (Permission Denied).");
    }
    // If running in local fallback / offline mode and remote doc is unavailable
    if (!remoteTransactionSucceeded) {
      if (err.message && !err.message.includes("offline")) {
        throw new Error(`فشل تحديث المشروع في السحابة: ${err.message}`);
      }
      window.dispatchEvent(
        new CustomEvent("taskflow_offline_sync_warning", {
          detail: {
            message: "تنبيه: تعذر الاتصال بـ Firestore السحابي. تم حفظ تعديل المشروع محلياً فقط ولم يُحفظ في السحابة.",
          },
        })
      );
      const local = localStore.getProjects(currentUser.uid).find((p) => p.id === projectId);
      if (local) {
        if (local.ownerId !== currentUser.uid) {
          throw new Error("Unauthorized: Only the project owner can update project details");
        }
        const localVersion = local.version || 1;
        if (expectedVersion !== undefined && localVersion !== expectedVersion) {
          const conflictErr = new Error("CONCURRENCY_CONFLICT: The project was updated by someone else.");
          (conflictErr as any).code = "CONCURRENCY_CONFLICT";
          (conflictErr as any).currentVersion = localVersion;
          throw conflictErr;
        }
        finalVersion = localVersion + 1;
      }
    }
  }

  // 2. Update localStore only after successful validation / atomic transaction
  const currentLocal = localStore.getProjects(currentUser.uid).find((p) => p.id === projectId);
  if (currentLocal) {
    const updated: Project = {
      ...currentLocal,
      name: trimmedName,
      description: trimmedDesc,
      version: finalVersion,
      updatedAt: new Date().toISOString(),
    };
    localStore.saveProject(updated);
  }

  logActivity(
    projectId,
    currentUser.uid,
    currentUser.displayName,
    "project_updated",
    "project",
    projectId,
    `Project details updated to "${trimmedName}"`,
    { projectName: trimmedName }
  ).catch((e) => console.warn("Activity logging failed in background:", e));
};

/**
 * Delete a project and its children in retryable chunks (Owner only).
 * Firestore batches are individually atomic, not atomic across every chunk.
 */
export const deleteProject = async (
  projectId: string,
  currentUser: UserProfile
): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  if (project.ownerId !== currentUser.uid) {
    throw new Error("Unauthorized: Only the project owner can delete this project");
  }

  // Delete children first, then the parent. If a later batch fails, the
  // project remains and a retry cleans up the remaining children.
  try {
    const tasksRef = collection(db, "projects", projectId, "tasks");
    const taskSnap = await getDocs(tasksRef);
    const activitiesRef = collection(db, "projects", projectId, "activities");
    const actSnap = await getDocs(activitiesRef);

    // Delete child documents first so rules validation on parent document succeeds
    const allChildDocs = [...taskSnap.docs, ...actSnap.docs];
    const chunkSize = 400;

    for (let i = 0; i < allChildDocs.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = allChildDocs.slice(i, i + chunkSize);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Now safely delete the parent project document
    const projectRef = doc(db, "projects", projectId);
    await deleteDoc(projectRef);
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("تعذر إكمال حذف المشروع بسبب صلاحيات Firestore. قد تحتاج إعادة المحاولة بعد مراجعة القواعد.");
    }
    throw new Error(`لم يكتمل حذف المشروع. قد يكون بعض محتوى المشروع قد حُذف، لكن المشروع بقي موجودًا. أعد المحاولة لإكمال التنظيف. (${err.message || "تعذر الاتصال بـ Firestore"})`);
  }

  // 2. Cascade delete from local store ONLY after remote deletion succeeds
  localStore.deleteProject(projectId);
};

/**
 * Add member to project by email (Owner only).
 */
export const addProjectMember = async (
  projectId: string,
  memberEmail: string,
  currentUser: UserProfile
): Promise<{ uid: string; displayName: string; email: string }> => {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  if (project.ownerId !== currentUser.uid) {
    throw new Error("Unauthorized: Only the project owner can add members");
  }

  const normalizedEmail = memberEmail.toLowerCase().trim();
  if (!normalizedEmail) throw new Error("Email is required");

  // Check if owner tries to add themselves
  if (currentUser.email && currentUser.email.toLowerCase().trim() === normalizedEmail) {
    throw new Error("alreadyMember");
  }

  // Check if already in project members by email
  const isAlreadyMember = Object.values(project.members || {}).some(
    (m) => m.email?.toLowerCase().trim() === normalizedEmail
  );
  if (isAlreadyMember) {
    throw new Error("alreadyMember");
  }

  let targetUser: UserProfile | null = null;

  // Only a registered-user lookup document is an eligible invitation target.
  try {
    const lookupRef = doc(db, "user_lookups", normalizedEmail);
    const lookupSnap = await getDoc(lookupRef);
    if (lookupSnap?.exists?.()) {
      const data = lookupSnap.data();
      if (data.email?.toLowerCase().trim() === normalizedEmail && typeof data.uid === "string") {
        targetUser = {
          uid: data.uid,
          email: normalizedEmail,
          displayName: typeof data.displayName === "string" ? data.displayName : normalizedEmail.split("@")[0],
        } as UserProfile;
      }
    }
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("تعذر التحقق من العضو بسبب قواعد Firestore.");
    }
    throw new Error(`تعذر التحقق من الحساب في Firestore: ${err.message || "خطأ غير معروف"}`);
  }

  if (!targetUser) {
    throw new Error("userNotFound");
  }

  if (project.memberIds.includes(targetUser.uid)) {
    throw new Error("alreadyMember");
  }

  const updatedMembers = {
    ...(project.members || {}),
    [targetUser.uid]: {
      email: targetUser.email,
      displayName: targetUser.displayName || targetUser.email.split("@")[0],
    },
  };

  const updatedProject: Project = {
    ...project,
    memberIds: [...project.memberIds, targetUser.uid],
    members: updatedMembers,
    updatedAt: new Date().toISOString(),
  };

  try {
    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      memberIds: arrayUnion(targetUser.uid),
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("فشل إضافة العضو: تم رفض التعديل بواسطة قواعد أمان Firestore (Permission Denied).");
    }
    throw new Error(`فشل إضافة العضو في السحابة: ${err.message || "تعذر الاتصال بـ Firestore السحابي"}`);
  }

  localStore.saveProject(updatedProject);

  logActivity(
    projectId,
    currentUser.uid,
    currentUser.displayName,
    "member_added",
    "membership",
    targetUser.uid,
    `Added ${targetUser.displayName || targetUser.email} to project`,
    {
      memberName: targetUser.displayName || targetUser.email.split("@")[0],
      memberEmail: targetUser.email,
    }
  ).catch((e) => console.warn("Activity logging failed in background:", e));

  return {
    uid: targetUser.uid,
    displayName: targetUser.displayName || targetUser.email.split("@")[0],
    email: targetUser.email,
  };
};

/**
 * Remove member from project (Owner only).
 */
export const removeProjectMember = async (
  projectId: string,
  memberUid: string,
  currentUser: UserProfile
): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  if (project.ownerId !== currentUser.uid) {
    throw new Error("Unauthorized: Only the project owner can remove members");
  }

  if (project.ownerId === memberUid) {
    throw new Error("cannotRemoveOwner");
  }

  const removedName = project.members?.[memberUid]?.displayName || "Member";
  const updatedMembers = { ...(project.members || {}) };
  delete updatedMembers[memberUid];

  const updatedProject: Project = {
    ...project,
    memberIds: project.memberIds.filter((id) => id !== memberUid),
    members: updatedMembers,
    updatedAt: new Date().toISOString(),
  };

  try {
    // Unassign first and remove access last. A failure leaves the member in
    // the project, so the owner can safely retry the remaining cleanup.
    const tasksRef = collection(db, "projects", projectId, "tasks");
    const assignedTasksQ = query(tasksRef, where("assigneeId", "==", memberUid));
    const assignedSnap = await getDocs(assignedTasksQ);

    if (!assignedSnap.empty) {
      const assignedTasks = assignedSnap.docs;
      const chunkSize = 400;
      for (let start = 0; start < assignedTasks.length; start += chunkSize) {
        const batch = writeBatch(db);
        assignedTasks.slice(start, start + chunkSize).forEach((taskDoc) => {
          batch.update(taskDoc.ref, {
            assigneeId: null,
            assigneeName: null,
            assigneeEmail: null,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    }

    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      memberIds: arrayRemove(memberUid),
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("تعذرت إزالة العضو. بقيت عضويته فعالة؛ أعد المحاولة بعد مراجعة قواعد Firestore.");
    }
    throw new Error(`تعذرت إزالة العضو بالكامل. بقيت عضويته فعالة، وقد تكون بعض مهامه أُلغيت. أعد المحاولة لإكمال العملية. (${err.message || "تعذر الاتصال بـ Firestore"})`);
  }

  // Update local store only after successful remote removal
  localStore.saveProject(updatedProject);

  // Unassign local tasks
  const tasks = localStore.getTasks(projectId);
  tasks.forEach((t) => {
    if (t.assigneeId === memberUid) {
      localStore.saveTask({
        ...t,
        assigneeId: null,
        assigneeName: null,
        assigneeEmail: null,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  logActivity(
    projectId,
    currentUser.uid,
    currentUser.displayName,
    "member_removed",
    "membership",
    memberUid,
    `Removed ${removedName} from project and unassigned their tasks`,
    {
      memberName: removedName,
      memberUid,
    }
  ).catch((e) => console.warn("Activity logging failed in background:", e));
};
