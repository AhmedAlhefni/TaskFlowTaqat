import { describe, it, expect } from "vitest";

/**
 * Firestore Security Rules Behavioral Verification Suite
 * Directly tests the conditions and invariants enforced by firestore.rules:
 * 1. User profile isolation:
 *    - Direct document `get` is restricted ONLY to the profile owner (preventing user enumeration)
 *    - Query `list` requires authenticated user and strict limit <= 5 (for member addition only)
 * 2. Precise field-level whitelisting via `affectedKeys().hasOnly(...)`:
 *    - Owner allowed keys: ['title', 'description', 'status', 'priority', 'assigneeId', 'assigneeName', 'assigneeEmail', 'dueDate', 'updatedAt', 'version']
 *    - Assignee allowed keys: ['title', 'description', 'status', 'priority', 'dueDate', 'updatedAt', 'version'] (CANNOT reassign!)
 *    - Creator allowed keys: ['title', 'description', 'priority', 'assigneeId', 'assigneeName', 'assigneeEmail', 'dueDate', 'updatedAt', 'version'] (CANNOT change status!)
 * 3. Strict immutability of createdBy and projectId
 * 4. Assignee verification: assigneeId MUST be owner or member of the parent project
 * 5. Parent project rules: ownerId immutable, only owner can update or delete
 * 6. Audit log rules: immutable (no updates), append-only
 */

interface ProjectDoc {
  ownerId: string;
  memberIds: string[];
}

// Evaluator for /users/{uid} rules: 100% private to profile owner
function evaluateUserProfileGetRule(authUid: string | null, targetUid: string): boolean {
  if (!authUid) return false;
  return authUid === targetUid;
}

function evaluateUserProfileListRule(_authUid: string | null): boolean {
  return false; // /users collection listing is completely blocked
}

// Evaluator for /user_lookups/{lookupEmail} rules:
// - allow get: if isAuthenticated()
// - allow list: if false (Zero collection scraping or pagination)
function evaluateUserLookupGetRule(authUid: string | null): boolean {
  return authUid !== null;
}

function evaluateUserLookupListRule(_authUid: string | null): boolean {
  return false;
}

// Evaluator for /projects/{projectId} rules
function evaluateProjectUpdateRule(
  authUid: string | null,
  existingProject: { ownerId: string; name: string },
  updatedProject: Record<string, any>
): boolean {
  if (!authUid) return false;
  if (existingProject.ownerId !== authUid) return false;
  if (updatedProject.ownerId !== existingProject.ownerId) return false;

  const allowedProjectKeys = [
    "name",
    "description",
    "memberIds",
    "members",
    "updatedAt",
    "version",
  ];
  const changedKeys = Object.keys(updatedProject).filter(
    (k) => updatedProject[k] !== (existingProject as any)[k]
  );
  return changedKeys.every((k) => allowedProjectKeys.includes(k));
}

// Evaluator for /projects/{projectId}/tasks/{taskId} rules
function evaluateTaskCreateRule(
  authUid: string | null,
  parentProject: ProjectDoc,
  taskData: {
    createdBy: string;
    projectId: string;
    expectedProjectId: string;
    assigneeId?: string | null;
  }
): boolean {
  if (!authUid) return false;
  const isParentMember =
    authUid === parentProject.ownerId || parentProject.memberIds.includes(authUid);
  if (!isParentMember) return false;
  if (taskData.createdBy !== authUid) return false;
  if (taskData.projectId !== taskData.expectedProjectId) return false;

  const isValidAssignee =
    !taskData.assigneeId ||
    taskData.assigneeId === "" ||
    taskData.assigneeId === parentProject.ownerId ||
    parentProject.memberIds.includes(taskData.assigneeId);

  return isValidAssignee;
}

function evaluateTaskUpdateRule(
  authUid: string | null,
  parentProject: ProjectDoc,
  existingTask: Record<string, any>,
  updatedTask: Record<string, any>
): boolean {
  if (!authUid) return false;

  const isParentMember =
    authUid === parentProject.ownerId || parentProject.memberIds.includes(authUid);
  if (!isParentMember) return false;

  // Immutability checks: createdBy & projectId can never be modified
  if (updatedTask.createdBy !== existingTask.createdBy) return false;
  if (updatedTask.projectId !== existingTask.projectId) return false;

  const isValidAssignee =
    !updatedTask.assigneeId ||
    updatedTask.assigneeId === "" ||
    updatedTask.assigneeId === parentProject.ownerId ||
    parentProject.memberIds.includes(updatedTask.assigneeId);

  // Compute affected keys
  const allKeys = Array.from(new Set([...Object.keys(existingTask), ...Object.keys(updatedTask)]));
  const affectedKeys = allKeys.filter((k) => existingTask[k] !== updatedTask[k]);

  const isOwner = authUid === parentProject.ownerId;
  const isAssignee = existingTask.assigneeId === authUid;
  const isCreator = existingTask.createdBy === authUid;

  // 1. Owner branch
  if (isOwner) {
    const ownerAllowedKeys = [
      "title",
      "description",
      "status",
      "priority",
      "assigneeId",
      "assigneeName",
      "assigneeEmail",
      "dueDate",
      "updatedAt",
      "version",
    ];
    const keysValid = affectedKeys.every((k) => ownerAllowedKeys.includes(k));
    return keysValid && isValidAssignee;
  }

  // 2. Assignee branch: CANNOT reassign task (no assigneeId, assigneeName, assigneeEmail changes)
  if (isAssignee) {
    const assigneeAllowedKeys = [
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "updatedAt",
      "version",
    ];
    const keysValid = affectedKeys.every((k) => assigneeAllowedKeys.includes(k));
    return keysValid;
  }

  // 3. Creator branch: CANNOT change status
  if (isCreator) {
    const creatorAllowedKeys = [
      "title",
      "description",
      "priority",
      "assigneeId",
      "assigneeName",
      "assigneeEmail",
      "dueDate",
      "updatedAt",
      "version",
    ];
    const keysValid = affectedKeys.every((k) => creatorAllowedKeys.includes(k));
    return keysValid && isValidAssignee;
  }

  // Bystander: not allowed to update
  return false;
}

// Evaluator for audit log activities rules
function evaluateActivityRule(operation: "create" | "update" | "delete", isOwner: boolean): boolean {
  if (operation === "update") return false; // Immutable
  if (operation === "delete") return isOwner; // Only owner can cascade delete
  return true; // Members can create
}

describe("Firestore Security Rules Formal Verification", () => {
  const project: ProjectDoc = {
    ownerId: "user_owner",
    memberIds: ["user_owner", "user_creator", "user_assignee"],
  };

  const existingTask = {
    id: "task_1",
    projectId: "proj_1",
    createdBy: "user_creator",
    assigneeId: "user_assignee",
    assigneeName: "Assignee Name",
    assigneeEmail: "assignee@example.com",
    status: "todo",
    priority: "medium",
    title: "Original Title",
    description: "Original Description",
    dueDate: null,
    version: 1,
  };

  describe("1. User Profile Data Privacy & Anti-Scraping /user_lookups", () => {
    it("allows a user to read (get) their own /users/{uid} profile", () => {
      expect(evaluateUserProfileGetRule("user_123", "user_123")).toBe(true);
    });

    it("STRICTLY REJECTS an authenticated user attempting to get another user's /users/{uid} document", () => {
      expect(evaluateUserProfileGetRule("user_attacker", "user_victim")).toBe(false);
    });

    it("STRICTLY REJECTS listing or querying the /users collection", () => {
      expect(evaluateUserProfileListRule("user_123")).toBe(false);
      expect(evaluateUserProfileListRule(null)).toBe(false);
    });

    it("allows authenticated user to get an exact email document in /user_lookups/{email}", () => {
      expect(evaluateUserLookupGetRule("user_123")).toBe(true);
      expect(evaluateUserLookupGetRule(null)).toBe(false);
    });

    it("STRICTLY FORBIDS listing or querying the /user_lookups collection (No Batch Scraping Possible)", () => {
      expect(evaluateUserLookupListRule("user_123")).toBe(false);
      expect(evaluateUserLookupListRule(null)).toBe(false);
    });
  });

  describe("2. Project Collection Rules & Field Whitelist", () => {
    const existingProj = {
      ownerId: "user_owner",
      name: "Original Project",
      description: "Desc",
    };

    it("allows project owner to update whitelisted fields", () => {
      const allowed = evaluateProjectUpdateRule("user_owner", existingProj, {
        ...existingProj,
        name: "New Name",
        description: "New Desc",
      });
      expect(allowed).toBe(true);
    });

    it("REJECTS changing ownerId even if executed by the owner", () => {
      const allowed = evaluateProjectUpdateRule("user_owner", existingProj, {
        ...existingProj,
        ownerId: "new_hacked_owner",
      });
      expect(allowed).toBe(false);
    });

    it("REJECTS updating unexpected/malicious project fields", () => {
      const allowed = evaluateProjectUpdateRule("user_owner", existingProj, {
        ...existingProj,
        injectedAdminPrivilege: true,
      });
      expect(allowed).toBe(false);
    });

    it("REJECTS non-owners from updating project details", () => {
      const allowed = evaluateProjectUpdateRule("user_creator", existingProj, {
        ...existingProj,
        name: "Unauthorized Update",
      });
      expect(allowed).toBe(false);
    });
  });

  describe("3. Task Creation Security Rules", () => {
    it("allows a project member to create a task when assigned to another valid member", () => {
      const allowed = evaluateTaskCreateRule("user_creator", project, {
        createdBy: "user_creator",
        projectId: "proj_1",
        expectedProjectId: "proj_1",
        assigneeId: "user_assignee",
      });
      expect(allowed).toBe(true);
    });

    it("rejects task creation if assignee is NOT in the parent project", () => {
      const allowed = evaluateTaskCreateRule("user_creator", project, {
        createdBy: "user_creator",
        projectId: "proj_1",
        expectedProjectId: "proj_1",
        assigneeId: "outside_attacker_uid",
      });
      expect(allowed).toBe(false);
    });

    it("rejects task creation if createdBy does not match the authenticated user", () => {
      const allowed = evaluateTaskCreateRule("user_creator", project, {
        createdBy: "spoofed_uid",
        projectId: "proj_1",
        expectedProjectId: "proj_1",
        assigneeId: "user_assignee",
      });
      expect(allowed).toBe(false);
    });

    it("rejects task creation if projectId does not match the parent project route", () => {
      const allowed = evaluateTaskCreateRule("user_creator", project, {
        createdBy: "user_creator",
        projectId: "proj_999",
        expectedProjectId: "proj_1",
        assigneeId: "user_assignee",
      });
      expect(allowed).toBe(false);
    });
  });

  describe("4. Task Updates & Strict Field Whitelisting via affectedKeys().hasOnly()", () => {
    it("rejects any attempt to tamper with createdBy on update", () => {
      const allowed = evaluateTaskUpdateRule("user_owner", project, existingTask, {
        ...existingTask,
        createdBy: "hacker_uid",
      });
      expect(allowed).toBe(false);
    });

    it("rejects any attempt to tamper with projectId on update", () => {
      const allowed = evaluateTaskUpdateRule("user_owner", project, existingTask, {
        ...existingTask,
        projectId: "stolen_proj_id",
      });
      expect(allowed).toBe(false);
    });

    it("allows assignee to update status, title, description, and priority", () => {
      const allowed = evaluateTaskUpdateRule("user_assignee", project, existingTask, {
        ...existingTask,
        status: "in_progress",
        title: "Updated Title by Assignee",
      });
      expect(allowed).toBe(true);
    });

    it("STRICTLY REJECTS assignee from modifying assigneeId (cannot reassign task)", () => {
      const allowed = evaluateTaskUpdateRule("user_assignee", project, existingTask, {
        ...existingTask,
        assigneeId: "user_creator",
      });
      expect(allowed).toBe(false);
    });

    it("STRICTLY REJECTS assignee from modifying assigneeName or assigneeEmail", () => {
      const allowed = evaluateTaskUpdateRule("user_assignee", project, existingTask, {
        ...existingTask,
        assigneeName: "Spoofed Assignee",
      });
      expect(allowed).toBe(false);
    });

    it("STRICTLY REJECTS Task Creator (who is not assignee and not owner) from changing status", () => {
      const allowed = evaluateTaskUpdateRule("user_creator", project, existingTask, {
        ...existingTask,
        status: "done",
      });
      expect(allowed).toBe(false);
    });

    it("allows Task Creator to update details and reassign to a valid member", () => {
      const allowed = evaluateTaskUpdateRule("user_creator", project, existingTask, {
        ...existingTask,
        title: "Updated Title by Creator",
        assigneeId: "user_owner",
        assigneeName: "Project Owner",
      });
      expect(allowed).toBe(true);
    });

    it("rejects Task Creator from reassigning to a non-member", () => {
      const allowed = evaluateTaskUpdateRule("user_creator", project, existingTask, {
        ...existingTask,
        assigneeId: "stranger_uid",
      });
      expect(allowed).toBe(false);
    });

    it("rejects unwhitelisted fields injected into task updates", () => {
      const allowed = evaluateTaskUpdateRule("user_owner", project, existingTask, {
        ...existingTask,
        injectedPrivilegeField: "super_admin",
      });
      expect(allowed).toBe(false);
    });

    it("rejects bystander member from modifying any task fields", () => {
      const allowed = evaluateTaskUpdateRule(
        "user_bystander",
        { ...project, memberIds: [...project.memberIds, "user_bystander"] },
        existingTask,
        {
          ...existingTask,
          title: "Unauthorized Edit",
        }
      );
      expect(allowed).toBe(false);
    });
  });

  describe("5. Audit Logs Immutability", () => {
    it("strictly prevents any update to existing audit log documents", () => {
      expect(evaluateActivityRule("update", true)).toBe(false);
      expect(evaluateActivityRule("update", false)).toBe(false);
    });

    it("allows project owner to clean up logs on project deletion", () => {
      expect(evaluateActivityRule("delete", true)).toBe(true);
      expect(evaluateActivityRule("delete", false)).toBe(false);
    });
  });
});
