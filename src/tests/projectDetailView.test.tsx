import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import "./setup";
import { ProjectDetailView } from "@/src/components/projects/ProjectDetailView";
import { LanguageProvider } from "@/src/context/LanguageContext";
import { ThemeProvider } from "@/src/context/ThemeContext";

vi.mock("@/src/lib/firebase", () => ({
  db: {},
  auth: {},
  googleProvider: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: "mock_id" })),
  getDoc: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => "mock-timestamp"),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

import { ToastProvider } from "@/src/components/common/Toast";

describe("ProjectDetailView Rendering", () => {
  const mockProject = {
    id: "proj_1j63iffb",
    name: "Thomas Gates",
    description: "Test desc",
    ownerId: "TzxiLM16tgT0drXqEXkY1eH9itC2",
    memberIds: ["TzxiLM16tgT0drXqEXkY1eH9itC2", "47AG6Y31JVPqTQ8OlOBeK4nK3Cl1"],
    members: {
      "TzxiLM16tgT0drXqEXkY1eH9itC2": { displayName: "Ahmad (Owner)", email: "owner@taskflow.demo" },
      "47AG6Y31JVPqTQ8OlOBeK4nK3Cl1": { displayName: "Ahmed Alhefni", email: "ahmedhefni2014@hotmail.com" },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  const mockUser = {
    uid: "TzxiLM16tgT0drXqEXkY1eH9itC2",
    email: "owner@taskflow.demo",
    displayName: "Ahmad (Owner)",
    createdAt: new Date().toISOString(),
  };

  it("renders ProjectDetailView with tasks without crashing", () => {
    const mockTasks = [
      {
        id: "task_1",
        projectId: "proj_1j63iffb",
        title: "Test Task 1",
        description: "Desc",
        status: "todo" as const,
        priority: "high" as const,
        assigneeId: "TzxiLM16tgT0drXqEXkY1eH9itC2",
        assigneeName: "Ahmad (Owner)",
        createdBy: "TzxiLM16tgT0drXqEXkY1eH9itC2",
        dueDate: "2026-10-30",
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <ToastProvider>
        <LanguageProvider>
          <ThemeProvider>
            <ProjectDetailView
              project={mockProject}
              tasks={mockTasks}
              activities={[]}
              currentUser={mockUser}
              onBackToDashboard={() => {}}
              onProjectDeleted={() => {}}
            />
          </ThemeProvider>
        </LanguageProvider>
      </ToastProvider>
    );

    expect(html).toContain("Test Task 1");
    expect(html).toContain("Thomas Gates");
  });
});
