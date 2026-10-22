import { describe, it, expect, vi, beforeEach } from "vitest";
import "./setup";
import { localStore } from "@/src/services/localStore";
import { deleteProject } from "@/src/services/projectService";
import { Project, Task, Activity, UserProfile } from "@/src/types";

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
  serverTimestamp: vi.fn(() => "mock-timestamp"),
  writeBatch: vi.fn(() => ({
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  runTransaction: vi.fn(),
  onSnapshot: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

describe("Safe Cascade Project Deletion", () => {
  const owner: UserProfile = {
    uid: "owner_cascade",
    email: "owner@cascade.local",
    displayName: "Cascade Owner",
    createdAt: new Date().toISOString(),
  };

  const projectA: Project = {
    id: "proj_to_delete",
    name: "Project To Delete",
    description: "Will be deleted",
    ownerId: owner.uid,
    memberIds: [owner.uid],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const projectB: Project = {
    id: "proj_survivor",
    name: "Project To Keep",
    description: "Must not be affected",
    ownerId: owner.uid,
    memberIds: [owner.uid],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const taskA: Task = {
    id: "task_a1",
    projectId: projectA.id,
    title: "Task in deleted project",
    description: "Task description",
    status: "todo",
    priority: "medium",
    assigneeId: null,
    dueDate: null,
    createdBy: owner.uid,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const taskB: Task = {
    id: "task_b1",
    projectId: projectB.id,
    title: "Task in keeper project",
    description: "Task description",
    status: "todo",
    priority: "medium",
    assigneeId: null,
    dueDate: null,
    createdBy: owner.uid,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const activityA: Activity = {
    id: "act_a1",
    projectId: projectA.id,
    actorUid: owner.uid,
    actorName: owner.displayName,
    action: "task_created",
    entityType: "task",
    entityId: taskA.id,
    summary: "Task created in project A",
    createdAt: new Date().toISOString(),
  };

  const activityB: Activity = {
    id: "act_b1",
    projectId: projectB.id,
    actorUid: owner.uid,
    actorName: owner.displayName,
    action: "task_created",
    entityType: "task",
    entityId: taskB.id,
    summary: "Task created in project B",
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStore.saveProject(projectA);
    localStore.saveProject(projectB);
    localStore.saveTask(taskA);
    localStore.saveTask(taskB);
    localStore.saveActivity(activityA);
    localStore.saveActivity(activityB);
  });

  it("safely deletes project, child tasks, and child activities while preserving other projects", async () => {
    // Perform cascade deletion of project A
    await deleteProject(projectA.id, owner);

    // Verify project A and its children are deleted
    const projects = localStore.getProjects(owner.uid);
    expect(projects.find((p) => p.id === projectA.id)).toBeUndefined();
    expect(localStore.getTasks(projectA.id)).toHaveLength(0);
    expect(localStore.getActivities(projectA.id)).toHaveLength(0);

    // Verify project B and its children remain intact
    expect(projects.find((p) => p.id === projectB.id)).toBeDefined();
    expect(localStore.getTasks(projectB.id)).toHaveLength(1);
    expect(localStore.getTasks(projectB.id)[0].id).toBe(taskB.id);
    expect(localStore.getActivities(projectB.id)).toHaveLength(1);
    expect(localStore.getActivities(projectB.id)[0].id).toBe(activityB.id);
  });

  it("cleanupOrphanTasks purges orphan tasks for projects that are no longer active", () => {
    // Both taskA and taskB are in local store initially
    expect(localStore.getTasks(projectA.id)).toHaveLength(1);
    expect(localStore.getTasks(projectB.id)).toHaveLength(1);

    // Call cleanup with only projectB active
    localStore.cleanupOrphanTasks([projectB.id]);

    expect(localStore.getTasks(projectA.id)).toHaveLength(0);
    expect(localStore.getTasks(projectB.id)).toHaveLength(1);

    // Call cleanup with 0 active projects
    localStore.cleanupOrphanTasks([]);
    expect(localStore.getTasks(projectB.id)).toHaveLength(0);
  });
});
