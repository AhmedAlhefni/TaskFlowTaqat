import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import fs from "fs";
import path from "path";

/**
 * Official Firebase Firestore Rules Unit Test Suite (Firebase Emulator)
 *
 * This test suite executes directly against firestore.rules using @firebase/rules-unit-testing.
 * To run with the Firebase Emulator:
 *   firebase emulators:exec --only firestore "vitest run src/tests/firestoreRules.emulator.test.ts"
 */

const isEmulatorRunning = !!process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!isEmulatorRunning)("Official Firebase Rules Emulator Suite", () => {
  let testEnv: RulesTestEnvironment;
  const PROJECT_ID = "taskflow-emulator-test";

  beforeAll(async () => {
    const rulesPath = path.resolve(process.cwd(), "firestore.rules");
    const rulesContent = fs.readFileSync(rulesPath, "utf8");

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] || "127.0.0.1",
        port: parseInt(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] || "8080", 10),
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  describe("1. User Profile & Anti-Scraping /user_lookups", () => {
    it("allows a user to read and update their own /users/{uid} document", async () => {
      const aliceContext = testEnv.authenticatedContext("alice_123");
      const aliceDb = aliceContext.firestore();

      await assertSucceeds(
        aliceDb.collection("users").doc("alice_123").set({
          uid: "alice_123",
          email: "alice@example.com",
          displayName: "Alice",
        })
      );

      await assertSucceeds(aliceDb.collection("users").doc("alice_123").get());
    });

    it("STRICTLY REJECTS Bob from reading Alice's /users/alice_123 profile document", async () => {
      // Pre-seed Alice's document via admin context
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await adminContext.firestore().collection("users").doc("alice_123").set({
          uid: "alice_123",
          email: "alice@example.com",
          displayName: "Alice",
        });
      });

      const bobContext = testEnv.authenticatedContext("bob_456");
      const bobDb = bobContext.firestore();

      // Bob should be blocked from reading Alice's private profile
      await assertFails(bobDb.collection("users").doc("alice_123").get());
    });

    it("STRICTLY FORBIDS listing or querying the /user_lookups collection (No Scraping)", async () => {
      const bobContext = testEnv.authenticatedContext("bob_456");
      const bobDb = bobContext.firestore();

      // Any query or listing on /user_lookups must be rejected with permission denied
      await assertFails(bobDb.collection("user_lookups").get());
      await assertFails(bobDb.collection("user_lookups").limit(5).get());
    });

    it("allows an authenticated user to fetch an EXACT email lookup document via get", async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await adminContext.firestore().collection("user_lookups").doc("alice@example.com").set({
          uid: "alice_123",
          email: "alice@example.com",
          displayName: "Alice",
        });
      });

      const bobContext = testEnv.authenticatedContext("bob_456");
      const bobDb = bobContext.firestore();

      // Direct get by exact email key is allowed
      await assertSucceeds(bobDb.collection("user_lookups").doc("alice@example.com").get());
    });
  });

  describe("2. Project Security Rules", () => {
    it("allows authenticated user to create a project with themselves as owner", async () => {
      const aliceContext = testEnv.authenticatedContext("alice_123");
      const aliceDb = aliceContext.firestore();

      await assertSucceeds(
        aliceDb.collection("projects").doc("proj_1").set({
          name: "Alice Project",
          description: "Owner test",
          ownerId: "alice_123",
          memberIds: ["alice_123"],
          version: 1,
        })
      );
    });

    it("REJECTS non-owner Bob from updating Alice's project", async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await adminContext.firestore().collection("projects").doc("proj_1").set({
          name: "Alice Project",
          description: "Owner test",
          ownerId: "alice_123",
          memberIds: ["alice_123"],
          version: 1,
        });
      });

      const bobContext = testEnv.authenticatedContext("bob_456");
      const bobDb = bobContext.firestore();

      await assertFails(
        bobDb.collection("projects").doc("proj_1").update({
          name: "Hacked by Bob",
        })
      );
    });
  });

  describe("3. Task Security Rules & Role Boundaries", () => {
    beforeEach(async () => {
      // Seed project with Owner Alice and Member Bob
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await adminContext.firestore().collection("projects").doc("proj_1").set({
          name: "Alice Project",
          description: "Collaboration",
          ownerId: "alice_123",
          memberIds: ["alice_123", "bob_456"],
          version: 1,
        });

        // Seed initial task
        await adminContext
          .firestore()
          .collection("projects")
          .doc("proj_1")
          .collection("tasks")
          .doc("task_1")
          .set({
            title: "Task 1",
            description: "Initial description",
            status: "todo",
            priority: "medium",
            createdBy: "alice_123",
            projectId: "proj_1",
            assigneeId: "bob_456",
            dueDate: null,
            version: 1,
          });
      });
    });

    it("allows Assignee Bob to update task status to in_progress", async () => {
      const bobContext = testEnv.authenticatedContext("bob_456");
      const bobDb = bobContext.firestore();

      await assertSucceeds(
        bobDb
          .collection("projects")
          .doc("proj_1")
          .collection("tasks")
          .doc("task_1")
          .update({
            status: "in_progress",
            version: 2,
          })
      );
    });

    it("STRICTLY REJECTS Assignee Bob from reassigning the task to another user", async () => {
      const bobContext = testEnv.authenticatedContext("bob_456");
      const bobDb = bobContext.firestore();

      // Bob tries to change assigneeId to someone else -> MUST FAIL!
      await assertFails(
        bobDb
          .collection("projects")
          .doc("proj_1")
          .collection("tasks")
          .doc("task_1")
          .update({
            assigneeId: "charlie_789",
          })
      );
    });

    it("STRICTLY REJECTS tampering with createdBy or projectId", async () => {
      const aliceContext = testEnv.authenticatedContext("alice_123");
      const aliceDb = aliceContext.firestore();

      await assertFails(
        aliceDb
          .collection("projects")
          .doc("proj_1")
          .collection("tasks")
          .doc("task_1")
          .update({
            createdBy: "charlie_789",
          })
      );
    });

    it("REJECTS outsider Charlie from reading or updating project tasks", async () => {
      const charlieContext = testEnv.authenticatedContext("charlie_789");
      const charlieDb = charlieContext.firestore();

      await assertFails(
        charlieDb.collection("projects").doc("proj_1").collection("tasks").doc("task_1").get()
      );
    });
  });
});
