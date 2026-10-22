import { describe, it, expect, vi, beforeEach } from "vitest";
import "./setup";
import { localStore } from "@/src/services/localStore";
import { updateProject, deleteProject, addProjectMember } from "@/src/services/projectService";
import { updateTask, updateTaskStatus, deleteTask } from "@/src/services/taskService";
import { Project, Task, UserProfile } from "@/src/types";

vi.mock("@/src/lib/firebase", () => ({
  db: {},
  auth: {},
  googleProvider: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, ...parts) => ({ id: parts[parts.length - 1], _mockId: parts[parts.length - 1] })),
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
    return callback({
      get: vi.fn(async (docRef: any) => {
        const storedProjects = JSON.parse(localStorage.getItem("taskflow_local_projects") || "{}");
        const storedTasks = JSON.parse(localStorage.getItem("taskflow_local_tasks") || "{}");
        const allProjects = Object.values(storedProjects) as any[];
        const allTasks = Object.values(storedTasks).flat() as any[];
        const targetId = docRef?._mockId || docRef?.id;
        const found = allProjects.find((p) => p.id === targetId) || allTasks.find((t) => t.id === targetId);
        return {
          exists: () => !!found,
          data: () => found,
        };
      }),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    });
  }),
  onSnapshot: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

describe("Role-Based Access Control (Owner & Member)", () => {
  const owner: UserProfile = {
    uid: "owner_1",
    email: "owner@taskflow.local",
    displayName: "Project Owner",
    createdAt: new Date().toISOString(),
  };

  const creatorMember: UserProfile = {
    uid: "creator_member_2",
    email: "creator@taskflow.local",
    displayName: "Creator Member",
    createdAt: new Date().toISOString(),
  };

  const assigneeMember: UserProfile = {
    uid: "assignee_member_3",
    email: "assignee@taskflow.local",
    displayName: "Assignee Member",
    createdAt: new Date().toISOString(),
  };

  const bystanderMember: UserProfile = {
    uid: "bystander_member_4",
    email: "bystander@taskflow.local",
    displayName: "Bystander Member",
    createdAt: new Date().toISOString(),
  };

  const testProject: Project = {
    id: "proj_auth_1",
    name: "Auth Test Project",
    description: "Testing strict permissions",
    ownerId: owner.uid,
    memberIds: [owner.uid, creatorMember.uid, assigneeMember.uid, bystanderMember.uid],
    members: {
      [owner.uid]: { displayName: owner.displayName, email: owner.email },
      [creatorMember.uid]: { displayName: creatorMember.displayName, email: creatorMember.email },
      [assigneeMember.uid]: { displayName: assigneeMember.displayName, email: assigneeMember.email },
      [bystanderMember.uid]: { displayName: bystanderMember.displayName, email: bystanderMember.email },
    },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testTask: Task = {
    id: "task_auth_1",
    projectId: testProject.id,
    title: "Permission Test Task",
    description: "Testing role boundaries",
    status: "todo",
    priority: "medium",
    createdBy: creatorMember.uid,
    assigneeId: assigneeMember.uid,
    assigneeName: assigneeMember.displayName,
    assigneeEmail: assigneeMember.email,
    dueDate: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStore.saveProject(testProject);
    localStore.saveTask(testTask);
  });

  describe("Project Operations", () => {
    it("allows Owner to update project details", async () => {
      await expect(
        updateProject(testProject.id, "Renamed By Owner", "Desc", owner)
      ).resolves.not.toThrow();
    });

    it("rejects non-owner Member attempting to update project details", async () => {
      await expect(
        updateProject(testProject.id, "Hacked Name", "Desc", creatorMember)
      ).rejects.toThrow(/Unauthorized: Only the project owner can update project details/);
    });

    it("rejects non-owner Member attempting to delete project", async () => {
      await expect(
        deleteProject(testProject.id, assigneeMember)
      ).rejects.toThrow(/Unauthorized: Only the project owner can delete this project/);
    });

    it("rejects non-owner Member attempting to add new members", async () => {
      await expect(
        addProjectMember(testProject.id, "newuser@taskflow.local", creatorMember)
      ).rejects.toThrow(/Unauthorized: Only the project owner can add members/);
    });

    it("rejects adding an email that is already a member", async () => {
      await expect(
        addProjectMember(testProject.id, "assignee@taskflow.local", owner)
      ).rejects.toThrow("alreadyMember");
    });

    it("throws userNotFound if email is not found in any lookup or store", async () => {
      await expect(
        addProjectMember(testProject.id, "nonexistent@taskflow.local", owner)
      ).rejects.toThrow("userNotFound");
    });
  });

  describe("Task Status Change Permissions", () => {
    it("allows Project Owner to change task status", async () => {
      await expect(
        updateTaskStatus(testProject.id, testTask.id, "in_progress", owner)
      ).resolves.not.toThrow();
    });

    it("allows Assigned Member to change task status", async () => {
      await expect(
        updateTaskStatus(testProject.id, testTask.id, "in_progress", assigneeMember)
      ).resolves.not.toThrow();
    });

    it("rejects Task Creator who is NOT the assignee from changing status", async () => {
      await expect(
        updateTaskStatus(testProject.id, testTask.id, "done", creatorMember)
      ).rejects.toThrow("notAuthorizedToChangeStatus");
    });

    it("rejects unassigned Bystander Member from changing status", async () => {
      await expect(
        updateTaskStatus(testProject.id, testTask.id, "done", bystanderMember)
      ).rejects.toThrow("notAuthorizedToChangeStatus");
    });
  });

  describe("Task Editing & Deletion Permissions", () => {
    it("allows Task Creator to update details", async () => {
      await expect(
        updateTask(testProject.id, testTask.id, { title: "Creator Updated Title" }, creatorMember)
      ).resolves.not.toThrow();
    });

    it("allows Assigned Member to update details", async () => {
      await expect(
        updateTask(testProject.id, testTask.id, { title: "Assignee Updated Title" }, assigneeMember)
      ).resolves.not.toThrow();
    });

    it("rejects unassigned non-creator Member from editing details", async () => {
      await expect(
        updateTask(testProject.id, testTask.id, { title: "Bystander Edit Attempt" }, bystanderMember)
      ).rejects.toThrow("notAuthorizedToEdit");
    });

    it("allows Task Creator to delete the task", async () => {
      await expect(
        deleteTask(testProject.id, testTask.id, creatorMember)
      ).resolves.not.toThrow();
    });

    it("rejects Assignee (who is not creator and not owner) from deleting task", async () => {
      await expect(
        deleteTask(testProject.id, testTask.id, assigneeMember)
      ).rejects.toThrow("notAuthorizedToDelete");
    });

    it("allows Owner to change status via updateTask", async () => {
      await expect(
        updateTask(testProject.id, testTask.id, { title: "Title", status: "in_progress" }, owner)
      ).resolves.not.toThrow();
    });

    it("allows Assignee to change status via updateTask", async () => {
      await expect(
        updateTask(testProject.id, testTask.id, { title: "Title", status: "in_progress" }, assigneeMember)
      ).resolves.not.toThrow();
    });

    it("rejects Creator from changing status via updateTask", async () => {
      await expect(
        updateTask(testProject.id, testTask.id, { title: "Title", status: "done" }, creatorMember)
      ).rejects.toThrow("notAuthorizedToChangeStatus");
    });
  });
});
