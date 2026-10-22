import { describe, it, expect, vi, beforeEach } from "vitest";
import "./setup";
import { localStore } from "@/src/services/localStore";
import { updateTask } from "@/src/services/taskService";
import { Project, Task, UserProfile } from "@/src/types";

vi.mock("@/src/lib/firebase", () => ({
  db: {},
  auth: {},
  googleProvider: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-timestamp"),
  writeBatch: vi.fn(() => ({
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  runTransaction: vi.fn(async () => {
    throw new Error("Firestore offline for unit testing");
  }),
  onSnapshot: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

describe("Activity Logging & Task Reassignment", () => {
  const owner: UserProfile = {
    uid: "owner_act",
    email: "owner@activity.local",
    displayName: "Manager Sarah",
    createdAt: new Date().toISOString(),
  };

  const devA: UserProfile = {
    uid: "dev_a",
    email: "deva@activity.local",
    displayName: "Ahmed Engineer",
    createdAt: new Date().toISOString(),
  };

  const devB: UserProfile = {
    uid: "dev_b",
    email: "devb@activity.local",
    displayName: "Lina Designer",
    createdAt: new Date().toISOString(),
  };

  const testProject: Project = {
    id: "proj_reassign",
    name: "Mobile App Redesign",
    description: "Activity tracking test",
    ownerId: owner.uid,
    memberIds: [owner.uid, devA.uid, devB.uid],
    members: {
      [owner.uid]: { displayName: owner.displayName, email: owner.email },
      [devA.uid]: { displayName: devA.displayName, email: devA.email },
      [devB.uid]: { displayName: devB.displayName, email: devB.email },
    },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testTask: Task = {
    id: "task_reassign_1",
    projectId: testProject.id,
    title: "Implement Dark Mode UI",
    description: "Follow design specs",
    status: "todo",
    priority: "high",
    createdBy: owner.uid,
    assigneeId: devA.uid,
    assigneeName: devA.displayName,
    assigneeEmail: devA.email,
    dueDate: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStore.saveProject(testProject);
    localStore.saveTask(testTask);
  });

  it("logs task_reassigned with performer, previous assignee, new assignee, and taskTitle in metadata", async () => {
    await updateTask(
      testProject.id,
      testTask.id,
      {
        title: testTask.title,
        assigneeId: devB.uid, // Reassign from devA to devB
      },
      owner,
      1
    );

    const activities = localStore.getActivities(testProject.id);
    expect(activities.length).toBeGreaterThan(0);

    const reassignLog = activities.find((a) => a.action === "task_reassigned");
    expect(reassignLog).toBeDefined();

    // Verifies performer details
    expect(reassignLog?.actorUid).toBe(owner.uid);
    expect(reassignLog?.actorName).toBe(owner.displayName);

    // Verifies task title and assignee transition metadata
    expect(reassignLog?.metadata).toBeDefined();
    expect(reassignLog?.metadata?.taskTitle).toBe("Implement Dark Mode UI");
    expect(reassignLog?.metadata?.previousAssigneeId).toBe(devA.uid);
    expect(reassignLog?.metadata?.previousAssigneeName).toBe(devA.displayName);
    expect(reassignLog?.metadata?.newAssigneeId).toBe(devB.uid);
    expect(reassignLog?.metadata?.newAssigneeName).toBe(devB.displayName);

    // Verifies ISO timestamp
    expect(reassignLog?.createdAt).toBeTruthy();
  });
});
