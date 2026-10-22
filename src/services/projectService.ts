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
  limit,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Project, UserProfile } from "@/src/types";
import { logActivity } from "@/src/services/activityService";
import { localStore } from "@/src/services/localStore";

/**
 * Real-time subscription to all projects where the user is an owner or member.
 * Falls back seamlessly to local store if Firestore rules are not deployed yet.
 */
export const subscribeUserProjects = (
  userId: string,
  onProjectsUpdated: (projects: Project[]) => void,
  onError?: (err: any) => void
) => {
  let isUsingLocalFallback = false;

  const handleLocalChange = () => {
    if (isUsingLocalFallback) {
      const local = localStore.getProjects(userId);
      onProjectsUpdated(local);
    }
  };

  window.addEventListener("taskflow_local_projects_change", handleLocalChange);

  try {
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("memberIds", "array-contains", userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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

        // Also sync to local cache
        projects.forEach((p) => localStore.saveProject(p));

        onProjectsUpdated(projects);
      },
      (err) => {
        if (err.code === "permission-denied") {
          window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
          isUsingLocalFallback = true;
          // Serve from local fallback immediately
          const local = localStore.getProjects(userId);
          onProjectsUpdated(local);
        } else {
          onError?.(err);
        }
      }
    );

    return () => {
      unsubscribe();
      window.removeEventListener("taskflow_local_projects_change", handleLocalChange);
    };
  } catch {
    isUsingLocalFallback = true;
    onProjectsUpdated(localStore.getProjects(userId));
    return () => {
      window.removeEventListener("taskflow_local_projects_change", handleLocalChange);
    };
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
 * Delete project and safely cascade clean up child tasks and activities (Owner only).
 * Uses batch chunking (max 400 writes per batch) to avoid Firestore limits.
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

  // 1. Try Firestore cascade cleanup
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
      throw new Error("فشل الحذف: ليس لديك صلاحية حذف هذا المشروع من السحابة (Permission Denied).");
    }
    if (err.message && !err.message.includes("not found")) {
      throw new Error(`فشل حذف المشروع من السحابة: ${err.message || "تعذر الاتصال بـ Firestore السحابي. لم يتم حذف المشروع."}`);
    }
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

  // 1. Direct document lookup by exact email in user_lookups collection
  try {
    const lookupRef = doc(db, "user_lookups", normalizedEmail);
    const lookupSnap = await getDoc(lookupRef);
    if (lookupSnap?.exists && lookupSnap.exists()) {
      targetUser = lookupSnap.data() as UserProfile;
    } else if (memberEmail.trim() !== normalizedEmail) {
      const origLookupRef = doc(db, "user_lookups", memberEmail.trim());
      const origSnap = await getDoc(origLookupRef);
      if (origSnap?.exists && origSnap.exists()) {
        targetUser = origSnap.data() as UserProfile;
      }
    }
  } catch (err: any) {
    console.warn("Firestore user lookup error in user_lookups:", err);
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
    }
  }

  // 2. Fallback: Query registered users collection by email (covers all existing accounts)
  if (!targetUser) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", normalizedEmail), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uDoc = snap.docs[0];
        const uData = uDoc.data();
        targetUser = {
          uid: uData.uid || uDoc.id,
          email: uData.email || normalizedEmail,
          displayName: uData.displayName || normalizedEmail.split("@")[0],
          photoURL: uData.photoURL || null,
        } as UserProfile;
      } else if (memberEmail.trim() !== normalizedEmail) {
        const q2 = query(usersRef, where("email", "==", memberEmail.trim()), limit(1));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          const uDoc = snap2.docs[0];
          const uData = uDoc.data();
          targetUser = {
            uid: uData.uid || uDoc.id,
            email: uData.email || memberEmail.trim(),
            displayName: uData.displayName || memberEmail.trim().split("@")[0],
            photoURL: uData.photoURL || null,
          } as UserProfile;
        }
      }

      // If found in users collection, immediately backfill user_lookups document
      if (targetUser && targetUser.uid) {
        setDoc(
          doc(db, "user_lookups", normalizedEmail),
          {
            uid: targetUser.uid,
            email: targetUser.email || normalizedEmail,
            displayName: targetUser.displayName || normalizedEmail.split("@")[0],
          },
          { merge: true }
        ).catch(() => {});
      }
    } catch (err: any) {
      console.warn("Fallback query to users collection error:", err);
    }
  }

  // 3. Fallback: Check existing projects across local cache / memory
  if (!targetUser) {
    const allLocalProjects = localStore.getProjects();
    for (const p of allLocalProjects) {
      if (p.members) {
        for (const [mUid, mInfo] of Object.entries(p.members)) {
          if (
            mInfo?.email &&
            (mInfo.email.toLowerCase().trim() === normalizedEmail ||
              mInfo.email.trim() === memberEmail.trim())
          ) {
            targetUser = {
              uid: mUid,
              email: mInfo.email,
              displayName: mInfo.displayName || mInfo.email.split("@")[0],
            } as UserProfile;
            break;
          }
        }
      }
      if (targetUser) break;
    }
  }

  // Strictly require user to exist in Firestore registered users
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
    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      memberIds: arrayRemove(memberUid),
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });

    const tasksRef = collection(db, "projects", projectId, "tasks");
    const assignedTasksQ = query(tasksRef, where("assigneeId", "==", memberUid));
    const assignedSnap = await getDocs(assignedTasksQ);

    if (!assignedSnap.empty) {
      const batch = writeBatch(db);
      assignedSnap.forEach((taskDoc) => {
        batch.update(taskDoc.ref, {
          assigneeId: null,
          assigneeName: null,
          assigneeEmail: null,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
      throw new Error("فشل إزالة العضو: تم رفض التعديل بواسطة قواعد أمان Firestore (Permission Denied).");
    }
    throw new Error(`فشل إزالة العضو في السحابة: ${err.message || "تعذر الاتصال بـ Firestore السحابي"}`);
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
