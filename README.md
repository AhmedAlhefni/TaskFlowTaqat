# TaskFlow — نظام إدارة المشاريع والمهام (Project & Task Management System)

A production-grade, highly responsive, bilingual (Arabic RTL & English LTR) web application for software teams to organize projects, assign tasks, track progress on real-time Kanban boards, and monitor deadlines.

Built to exceed the **TAQAT / CodeMap Technical Assessment SRS Specification (Version 1.0, October 2026)**.

---

## 🚀 Live Deployment & Demo Access

- **Public Shared Application URL**:  


### 🔑 Pre-Configured Test Accounts (One-Click or Manual)
You can use the 1-click Quick Demo buttons on the Login screen, or enter credentials manually:

| Role | Email | Password | Intended Role in Demos |
|---|---|---|---|
| **Project Owner** | `owner@taskflow.demo` | `DemoPass123!` | Full project control, member invites/removals, cascade deletion, task assignment |
| **Team Member (Assignee)** | `member@taskflow.demo` | `DemoPass123!` | Assigned to tasks, can advance status (`todo` ➡️ `in_progress` ➡️ `done`), edit assigned tasks |


---

## 🌟 Key Features & Capabilities

### 1. Authentication & Profiles
- **Firebase Authentication**:
  - Email & Password registration and login with input validation (`schemas.ts`).
  - Google Sign-In (`signInWithPopup`).
  - Persistent auth session across page refreshes.
  - User profiles in Firestore (`users/{uid}`) with display name, email, and timestamp.
  - Password reset via email.

### 2. Project Management (CRUD & Ownership)
- **Create Project**: Name (3–80 characters) and description (up to 1,000 characters). Creator becomes owner and initial member.
- **Strict Firestore Persistence Guarantee**: Writes are committed to Firestore before confirming success; any security rule refusal or network error is immediately surfaced with clear feedback.
- **Project Settings (Owner Only)**:
  - Edit project title and description.
  - **Membership Management**: Add registered users by exact email lookup from `users` collection.
  - **Remove Member**: Automatically unassigns any tasks currently assigned to the removed member, preserving audit history.
  - Owner cannot remove themselves from their own project.
- **Safe Cascade Deletion**: Removes all sub-collection tasks (`projects/{projectId}/tasks`) and activity history (`projects/{projectId}/activities`) atomically before removing the parent project document.

### 3. Task Management & Rigorous Authorization Matrix
- **Task Creation**: Title (3–120 characters), description (up to 1,000 chars), priority (`low`, `medium`, `high`), status (`todo`, `in_progress`, `done`), due date, and member assignment. Available to all active project members.
- **Role-Based Task Operations (SRS Specification)**:
  - **Edit Task Details**: Allowed for Project Owner, Task Creator, or Assigned Member.
  - **Change Task Status**: Strictly restricted to the **Project Owner** or the **Assigned Member** (enforced in UI, client services, and Firestore rules).
  - **Delete Task**: Strictly restricted to the **Project Owner** or the **Task Creator** (ordinary assigned members cannot delete tasks they did not create).
  - **Task Assignment**: Restricted exclusively to active members of the parent project.

### 4. Interactive Drag-and-Drop Kanban Board & Multi-Views
- **Kanban Board**: Three columns (**To Do**, **In Progress**, **Done**), task counts per column, HTML5 drag-and-drop with real-time optimistic update and server rollback upon failure.
- **Table View**: Sortable columns, quick filters, inline priority badges, and bulk actions.
- **Calendar View**: Month grid mapping tasks to their deadlines with status color codes.
- **Gantt / Timeline View**: Visual horizontal timeline of upcoming deadlines.

### 5. Task Discovery: Search, Filters & Sorting
- **Real-Time Search**: Search task titles and descriptions instantly.
- **Multi-criteria Filtering**:
  - Status filter (`all`, `todo`, `in_progress`, `done`).
  - Priority filter (`all`, `high`, `medium`, `low`).
  - Assignee filter (`all`, `unassigned`, or specific project member).
  - **Overdue Tasks Filter (Evaluation Exercise)**: Displays only incomplete tasks whose due date is strictly before today's calendar date in the local timezone. Tasks due later today or marked "Done" are not considered overdue.
- **Sorting Options**:
  - By Deadline (Earliest first / Latest first).
  - By Priority (High to Low / Low to High).
  - By Created Date.

### 6. Workspace Dashboard & Real-Time Analytics
- Dynamic KPIs: Total Projects, Total Tasks, To Do, In Progress, Done, Overdue count.
- Workspace-wide task completion rate percentage: `(completed / total) * 100` (safe handling of 0 tasks).
- Task status breakdown distribution visualization.
- Overdue tasks alert banner with direct awareness.

### 7. Activity History (Audit Log)
- Real-time chronological audit trail of all project events:
  - Project created & updated.
  - Member added & removed.
  - Task created, updated, status changed, and deleted.
- Immutable audit log enforced by Firestore security rules.

### 8. Full Bilingual Support & Theme Persistence
- **Arabic (RTL) & English (LTR)**:
  - Language toggle switches document `dir="rtl"` / `dir="ltr"` and `lang="ar"` / `lang="en"`.
  - Comprehensive translations for all UI strings, badges, errors, and empty states.
  - Persisted in `localStorage`.
- **Light & Dark Mode**:
  - Tailored color palette with high contrast and smooth transitions.
  - Persisted in `localStorage`.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React 19, TypeScript (Strict Mode), Vite 8.
- **Styling**: Tailwind CSS v4, Lucide Icons, fully responsive layout (375px mobile to 4K desktop).
- **Backend & Database**: Firebase Authentication, Cloud Firestore with real-time WebSocket listeners (`onSnapshot`).
- **Data Integrity**: Optimistic Concurrency Control with atomic `version` increments on projects and tasks (`runTransaction`).
- **Automated Testing**: Vitest test suite with 43 passing tests across 7 test suites covering permissions, concurrency, cascade deletion, validation, error mapping, and Firestore security rules.

---

## 🔒 Security Architecture (`firestore.rules`)

1. **User Profiles (`/users/{uid}`)**:
   - Authenticated users can read minimal profile for member lookup.
   - Users can only create or update their own profile document (`request.auth.uid == uid`).
   - Profile documents cannot be deleted.

2. **Projects (`/projects/{projectId}`)**:
   - Only verified project members or the owner can read project data.
   - Project creation requires authenticated user to set themselves as owner and initial member.
   - Project modification and deletion is strictly limited to the project owner.
   - `ownerId` is immutable once created.

3. **Tasks (`/projects/{projectId}/tasks/{taskId}`)**:
   - `createdBy` and `projectId` are immutable and cannot be tampered with.
   - Tasks can only be assigned to verified active project members or the owner (`isValidAssignee`).
   - Only the **Project Owner** or **Assigned Member** can modify task status.
   - Assignees cannot reassign tasks to other users (`request.resource.data.assigneeId == resource.data.assigneeId`).
   - Task Creators who are not assigned can edit details, but cannot change task status.
   - Only the **Project Owner** or **Task Creator** can delete tasks.

4. **Activities (`/projects/{projectId}/activities/{activityId}`)**:
   - Append-only audit logs created by project members.
   - Modifications (`update`) are forbidden (`allow update: if false;`).
   - Deletion is restricted to the Project Owner during safe cascade cleanup.

---

## 🧪 Automated Test Suite

Run the full test suite anytime with:
```bash
npm test
```

### Test Coverage Summary:
- **`src/tests/firestoreRulesSimulation.test.ts`**: Verifies Firestore security rules logic (immutability of createdBy/projectId, assignee membership checks, status modification locks, and bystander rejection).
- **`src/tests/permissions.test.ts`**: Verifies role-based access control (Owner, Creator, Assignee, Bystander).
- **`src/tests/concurrency.test.ts`**: Verifies optimistic concurrency control and conflict prevention.
- **`src/tests/cascadeDelete.test.ts`**: Verifies atomic cascade deletion of tasks and activities without orphaned records.
- **`src/tests/validation.test.ts`**: Verifies calendar-date overdue calculation and localization.
- **`src/tests/authErrorMapper.test.ts`**: Verifies user-friendly Arabic & English error messages for Firebase Auth errors.
- **`src/tests/activity.test.ts`**: Verifies audit log activity recording.

---

## 📋 Evaluation Checklist & Acceptance Tests

| Test ID | Test Scenario | Expected Result | Status |
|---|---|---|---|
| **TC-01** | Register with valid inputs | Account and Firestore profile created | ✅ Pass |
| **TC-02** | Register with invalid email | Form displays validation error | ✅ Pass |
| **TC-03** | Register with weak password (< 6 chars) | Validation prevents submission | ✅ Pass |
| **TC-04** | Log in and refresh page | Auth session persists across reloads | ✅ Pass |
| **TC-05** | Log out | Redirected to sign-in view | ✅ Pass |
| **TC-06** | Create a project | Saved to Firestore, visible in dashboard | ✅ Pass |
| **TC-07** | Update project as member | Rejected; settings restricted to Owner | ✅ Pass |
| **TC-08** | Access foreign project | Access denied; only members can view | ✅ Pass |
| **TC-09** | Delete project with tasks | Atomically removes project, tasks, and activities | ✅ Pass |
| **TC-11** | Add existing registered user | Added to project members and sees project | ✅ Pass |
| **TC-12** | Add duplicate member | Prevented with clear user alert | ✅ Pass |
| **TC-13** | Add unregistered email | Rejected with "User not found" error | ✅ Pass |
| **TC-14** | Remove member | Removed, access revoked, tasks unassigned | ✅ Pass |
| **TC-15** | Create task without title (< 3 chars) | Validation prevents saving | ✅ Pass |
| **TC-16** | Assign task to non-member | Dropdown only allows project members | ✅ Pass |
| **TC-17** | Change task status as assignee | Permitted and updates in real time | ✅ Pass |
| **TC-18** | Change status as unassigned member | Denied; status control locked for non-assignee | ✅ Pass |
| **TC-19** | Delete another member's task as member | Denied; delete action restricted to creator/owner | ✅ Pass |
| **TC-20** | Search by title keyword | Real-time client-side filter displays matches | ✅ Pass |
| **TC-21** | Filter by priority and status | Conjunction of filters returns exact match | ✅ Pass |
| **TC-22** | Filter overdue tasks | Shows only incomplete tasks with due date < today | ✅ Pass |
| **TC-23** | Task due today | Not marked overdue under calendar-day rule | ✅ Pass |
| **TC-24** | Completed task with past date | Not marked overdue | ✅ Pass |
| **TC-37** | Mobile 375px responsiveness | No horizontal overflow; all actions usable | ✅ Pass |
| **TC-39** | Switch to Arabic | Full RTL layout, Cairo typography, Arabic copy | ✅ Pass |
| **TC-40** | Switch to English | Full LTR layout, Inter typography, English copy | ✅ Pass |
| **TC-41** | Switch theme & reload | Dark / Light preference persists | ✅ Pass |
