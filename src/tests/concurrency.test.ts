import { describe, it, expect, vi, beforeEach } from "vitest";
import "./setup";
import { localStore } from "@/src/services/localStore";
import { updateProject } from "@/src/services/projectService";
import { updateTask, updateTaskStatus } from "@/src/services/taskService";
import { Project, Task, UserProfile } from "@/src/types";

// Mock Firebase Firestore so unit tests execute deterministically in-memory
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
  runTransaction: vi.fn(async (_db, callback) => {
    // Simulate remote Firestore error to force local store atomic concurrency fallback
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

describe("Atomic Optimistic Concurrency Control", () => {
  const ownerUser: UserProfile = {
    uid: "owner_123",
    email: "owner@taskflow.local",
    displayName: "Owner User",
    createdAt: new Date().toISOString(),
  };

  const memberUser: UserProfile = {
    uid: "member_456",
    email: "member@taskflow.local",
    displayName: "Member User",
    createdAt: new Date().toISOString(),
  };

  const initialProject: Project = {
    id: "proj_100",
    name: "Original Project Name",
    description: "Initial description",
    ownerId: ownerUser.uid,
    memberIds: [ownerUser.uid, memberUser.uid],
    members: {
      [ownerUser.uid]: { displayName: "Owner User", email: "owner@taskflow.local" },
      [memberUser.uid]: { displayName: "Member User", email: "member@taskflow.local" },
    },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const initialTask: Task = {
    id: "task_200",
    projectId: initialProject.id,
    title: "Original Task Title",
    description: "Initial task description",
    status: "todo",
    priority: "medium",
    assigneeId: memberUser.uid,
    assigneeName: memberUser.displayName,
    assigneeEmail: memberUser.email,
    dueDate: null,
    createdBy: ownerUser.uid,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStore.saveProject(initialProject);
    localStore.saveTask(initialTask);
  });

  describe("Project Concurrency", () => {
    it("successfully increments version from 1 to 2 when expectedVersion matches", async () => {
      await updateProject(
        initialProject.id,
        "Updated Project Name",
        "New description",
        ownerUser,
        1 // expectedVersion
      );

      const saved = localStore.getProjects(ownerUser.uid).find((p) => p.id === initialProject.id);
      expect(saved).toBeDefined();
      expect(saved?.name).toBe("Updated Project Name");
      expect(saved?.version).toBe(2);
    });

    it("rejects project update with CONCURRENCY_CONFLICT if expectedVersion is stale", async () => {
      // First update brings project to version 2
      await updateProject(
        initialProject.id,
        "First Update",
        "Updated description",
        ownerUser,
        1
      );

      // Second user with stale version 1 tries to update
      await expect(
        updateProject(
          initialProject.id,
          "Conflicting Update",
          "Should be rejected",
          ownerUser,
          1 // Stale expected version!
        )
      ).rejects.toThrow(/CONCURRENCY_CONFLICT/);

      // Verify data was NOT overwritten
      const saved = localStore.getProjects(ownerUser.uid).find((p) => p.id === initialProject.id);
      expect(saved?.name).toBe("First Update");
      expect(saved?.version).toBe(2);
    });
  });

  describe("Task Concurrency", () => {
    it("successfully increments task version when expectedVersion matches", async () => {
      await updateTask(
        initialProject.id,
        initialTask.id,
        {
          title: "Updated Task Title",
          description: "Fresh details",
          priority: "high",
        },
        ownerUser,
        1 // expectedVersion
      );

      const saved = localStore.getTasks(initialProject.id).find((t) => t.id === initialTask.id);
      expect(saved).toBeDefined();
      expect(saved?.title).toBe("Updated Task Title");
      expect(saved?.version).toBe(2);
    });

    it("rejects task update with CONCURRENCY_CONFLICT if expectedVersion is stale", async () => {
      // User A updates task to version 2
      await updateTask(
        initialProject.id,
        initialTask.id,
        { title: "Version 2 Title" },
        ownerUser,
        1
      );

      // User B with stale version 1 attempts update
      await expect(
        updateTask(
          initialProject.id,
          initialTask.id,
          { title: "Stale Overwrite Attempt" },
          ownerUser,
          1 // Stale expected version!
        )
      ).rejects.toThrow(/CONCURRENCY_CONFLICT/);

      // Verify the task title is still "Version 2 Title"
      const current = localStore.getTasks(initialProject.id).find((t) => t.id === initialTask.id);
      expect(current?.title).toBe("Version 2 Title");
      expect(current?.version).toBe(2);
    });

    it("rejects task status change with CONCURRENCY_CONFLICT if expectedVersion is stale", async () => {
      // Update task status to in_progress (version 1 -> 2)
      await updateTaskStatus(
        initialProject.id,
        initialTask.id,
        "in_progress",
        memberUser, // Assigned member
        1
      );

      // Another user attempts status update using stale version 1
      await expect(
        updateTaskStatus(
          initialProject.id,
          initialTask.id,
          "done",
          ownerUser,
          1 // Stale!
        )
      ).rejects.toThrow(/CONCURRENCY_CONFLICT/);

      const current = localStore.getTasks(initialProject.id).find((t) => t.id === initialTask.id);
      expect(current?.status).toBe("in_progress");
      expect(current?.version).toBe(2);
    });
  });
});
