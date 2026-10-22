import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Activity, ActivityAction } from "@/src/types";
import { localStore } from "@/src/services/localStore";

export const logActivity = async (
  projectId: string,
  actorUid: string,
  actorName: string,
  action: ActivityAction,
  entityType: "project" | "task" | "membership",
  entityId: string,
  summary: string,
  metadata?: Record<string, any>
): Promise<void> => {
  const newActivity: Activity = {
    id: "act_" + Math.random().toString(36).substring(2, 9),
    projectId,
    actorUid,
    actorName: actorName || "User",
    action,
    entityType,
    entityId,
    summary,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  };

  // 1. Save in localStore
  localStore.saveActivity(newActivity);

  // 2. Try Firestore
  try {
    const activitiesRef = collection(db, "projects", projectId, "activities");
    await addDoc(activitiesRef, {
      ...newActivity,
      createdAt: serverTimestamp(),
    });
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
    }
  }
};

export const getProjectActivities = async (
  projectId: string,
  maxItems = 30
): Promise<Activity[]> => {
  try {
    const activitiesRef = collection(db, "projects", projectId, "activities");
    const q = query(activitiesRef, orderBy("createdAt", "desc"), limit(maxItems));
    const snap = await getDocs(q);
    const results = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Activity[];

    if (results.length > 0) return results;
  } catch (err: any) {
    if (err.code === "permission-denied") {
      window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
    }
  }

  // Fallback to localStore
  return localStore.getActivities(projectId).slice(0, maxItems);
};
