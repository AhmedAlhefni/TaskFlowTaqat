Project & Task Management System

SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

7-Day Full-Stack Development Challenge • Version 1.0 • 15 October 2026

Prepared for TAQAT / CodeMap trainees

Assessment technologies: HTML, CSS, JavaScript, React, Next.js,
Firebase, Git & GitHub

# 1. Executive Summary

TaskFlow is a responsive web application for small software teams to
create projects, assign tasks, track progress, and monitor deadlines.
Each trainee builds a working application within seven calendar days.
The challenge evaluates end-to-end development skills rather than visual
design alone. This document defines the minimum viable product (MVP),
constraints, user stories, data model, security requirements, acceptance
criteria, test cases, delivery rules, and scoring rubric.

# 2. Scope and Boundaries

## 2.1 In scope

- Email/password registration, sign-in, sign-out, and protected pages.

- Project creation, listing, editing and deletion by the owner.

- Task creation, listing, editing and deletion; status, priority,
  deadline, and assignment.

- Project membership by selecting existing registered users (simple
  invite-free MVP).

- Personal dashboard, task filters/search, and responsive layout.

- Firebase Firestore persistence, access-control rules, deployment, and
  GitHub documentation.

## 2.2 Out of scope

- Payments, billing, real-time chat, email invitations, notifications,
  file uploads, and third-party integrations.

- Enterprise role hierarchies, complex analytics, offline-first sync,
  and multi-tenant administration.

- Automated deployment pipelines or mandatory external UI component
  libraries.

## 2.3 Assumptions

One trainee is the preferred evaluation unit; pairs may be allowed with
individual code review. A project has one owner and zero or more
members. A user may be assigned only to tasks in projects they belong
to. Trainees use Firebase Authentication and Cloud Firestore; no
separate backend is required. An internet connection and Firebase
project access are available.

# 3. Stakeholders and Personas

| Persona | Description | Primary goals |
|----|----|----|
| Project Owner | TAQAT | Manage project, members, and all project tasks |
| Project Member | CodeMabe Trainees | View shared project and manage authorized tasks |
| Evaluator | Reviewer with demo access | Verify requirements, inspect code and assess understanding |

# 4. User Roles and Authorization

| Operation                 | Owner | Member                  | Unauthenticated |
|---------------------------|-------|-------------------------|-----------------|
| View project and tasks    | Yes   | Yes                     | No              |
| Edit/delete project       | Yes   | No                      | No              |
| Manage project membership | Yes   | No                      | No              |
| Create task               | Yes   | Yes                     | No              |
| Edit task                 | Yes   | Own/assigned tasks only | No              |
| Delete task               | Yes   | Own-created tasks only  | No              |
| Change task status        | Yes   | Assigned tasks only     | No              |

Authorization must be enforced in Firestore Security Rules, not only by
hiding buttons. Membership removal should revoke future access. A user
must not gain access by changing a project ID in a URL.

# 5. Functional Requirements

| ID | Requirement | Expected behavior |
|----|----|----|
| FR-01 | Registration | Register with name, email and password; show validation and errors. |
| FR-02 | Login/logout | Authenticate using Firebase Auth; redirect on login and logout. |
| FR-03 | Protected routes | Unauthenticated visitors cannot access dashboard/project pages. |
| FR-04 | User profile | Store public display name and UID; never store plaintext passwords. |
| FR-05 | Project creation | Owner enters project name and optional description. |
| FR-06 | Project management | Owner can view, update, delete own projects with confirmation. |
| FR-07 | Membership | Owner can add/remove an existing user by email; prevent duplicate membership. |
| FR-08 | Task creation | Create task with title, description, status, priority, due date and optional assignee. |
| FR-09 | Task updates | Authorized users can update permitted task fields. |
| FR-10 | Task deletion | Owner or task creator can delete task with confirmation. |
| FR-11 | Task status | Statuses: To Do, In Progress, Done; initial status To Do. |
| FR-12 | Task assignment | Assignee must be an active member of the relevant project. |
| FR-13 | Task discovery | Filter by status, priority, assignee; search task title client-side. |
| FR-14 | Dashboard | Display accessible projects, total tasks, tasks by status, and overdue tasks. |
| FR-15 | Empty/error states | Clear messages for empty lists, loading, access denied and failed saves. |
| FR-16 | Responsive UI | Functional at mobile (375px), tablet (768px), and desktop (1280px). |
| FR-17 | Deployment | Publish an accessible demo with environment variables configured. |
| FR-18 | Audit fields | Record createdAt and updatedAt on projects and tasks. |

# 6. User Stories and Acceptance Criteria

| Story | User need | Acceptance criteria |
|----|----|----|
| US-01 | As a visitor, I want to register so I can manage my work. | Valid registration creates Auth account and user profile; invalid email/weak password show feedback. |
| US-02 | As a user, I want to sign in so only I access my projects. | Successful login opens dashboard; refresh preserves authenticated session; logout blocks protected views. |
| US-03 | As an owner, I want to create a project to organize work. | Project appears in list, persists after refresh, and is not visible to outsiders. |
| US-04 | As an owner, I want to add teammates. | Existing account can be added once; non-existing email gives a clear error; removed member loses access. |
| US-05 | As a member, I want to create a task. | Task persists with required title and project ID; invalid data is rejected. |
| US-06 | As an assignee, I want to update my task status. | Allowed status change persists; unauthorized updates are denied. |
| US-07 | As a user, I want to find tasks quickly. | Search and filters return correct results and support empty result sets. |
| US-08 | As an owner, I want to see progress. | Dashboard counts agree with Firestore task records and overdue definition. |

# 7. Application Screens and Navigation

| Route (suggested) | Screen | Core components |
|----|----|----|
| / | Landing / redirect | Login or dashboard redirect |
| /register | Registration | Name/email/password form |
| /login | Sign in | Email/password form, error states |
| /dashboard | Overview | Summary cards, project list, overdue tasks |
| /projects/new | Create project | Validated project form |
| /projects/\[id\] | Project details | Members, task list, filters, create task |
| /projects/\[id\]/settings | Project settings | Owner-only edit, membership, delete |

Suggested navigation: Register/Login → Dashboard → Project Details →
Task Create/Edit. Users should have visible navigation back to the
dashboard and clear logout access.

# 8. UX / UI Specification

- Clean information hierarchy: page title, action buttons, status
  labels, clear task cards or table.

- Use native HTML labels, keyboard-operable buttons, visible focus, and
  adequate color contrast.

- Show form errors next to inputs; disable submit while saving; confirm
  destructive actions.

- Avoid relying on color alone to distinguish statuses or priorities.

- Support mobile stacking and horizontal overflow prevention; avoid
  fixed-width layouts.

- Display loading placeholders and friendly empty states; use consistent
  date formatting.

# 9. Technical Architecture

Client: Next.js App Router with React components and CSS (plain CSS, CSS
Modules or another learned approach). Authentication: Firebase
Authentication (email/password). Database: Cloud Firestore. Hosting:
Vercel or Firebase-compatible deployment. Source control: GitHub.
Firebase client SDK may be used from browser components; sensitive
permissions are enforced by Firestore rules. Keep Firebase public
configuration in environment variables and do not commit credentials or
service-account keys.

Suggested modules: app routes; components/AuthForm, ProjectCard,
TaskForm, TaskList, FilterBar, DashboardStats; lib/firebase;
services/projects and tasks; hooks/auth; styles. Use React state/hooks
to manage forms, loading, and subscriptions.

# 10. Firestore Data Model

| Collection / document | Fields | Notes |
|----|----|----|
| users/{uid} | displayName, email, createdAt | UID must match Firebase Auth UID |
| projects/{projectId} | name, description, ownerId, memberIds\[\], createdAt, updatedAt | memberIds includes ownerId |
| projects/{projectId}/tasks/{taskId} | title, description, status, priority, assigneeId\|null, createdBy, dueDate\|null, createdAt, updatedAt | Task belongs to parent project |

## 10.1 Field validation

| Field | Rule |
|----|----|
| Project name | Required; 3–80 characters |
| Task title | Required; 3–120 characters |
| Description | Optional; max 1000 characters |
| Status | One of todo, in_progress, done |
| Priority | One of low, medium, high |
| Due date | Optional valid date; overdue if earlier than today and not done |
| Assignee | Null or UID of project member |
| Timestamps | Use server timestamps where practical |

## 10.2 Data design notes

Task documents are nested below projects to simplify project-scoped
queries. The project owner should control membership changes. For a
one-week challenge, use a small test dataset and client-side filtering
of fetched project tasks. A production system would require careful
query indexing, pagination, and additional validation.

# 11. Security and Privacy

- Enable Firebase email/password authentication and use security rules
  denying access by default.

- Users can read their own profile; public user lookup should be
  narrowly scoped and avoid exposing unrelated personal data.

- Project read access: owner or member. Project update/delete: owner
  only.

- Task reads: project members. Task creates: members with valid project
  reference and creator identity.

- Task writes: owner or specifically authorized member; enforce
  immutable project linkage and valid status/priority.

- Do not treat UI permissions as security; test denied reads and writes
  from a second account.

- Do not put service-account keys in frontend code or GitHub; provide
  .env.example only.

- Use fictional demo users and tasks; do not upload real client or
  personal data.

# 12. Non-Functional Requirements

| ID | Quality attribute | Measurable target |
|----|----|----|
| NFR-01 | Performance | Dashboard should feel responsive on typical mobile internet; loading state shown for slow requests. |
| NFR-02 | Availability | Deployed demo accessible during evaluation, subject to external service availability. |
| NFR-03 | Usability | New user can create project and task without verbal guidance. |
| NFR-04 | Compatibility | Current Chrome and mobile browser tested. |
| NFR-05 | Reliability | Writes survive refresh; failures show retry guidance. |
| NFR-06 | Maintainability | Readable components, consistent naming, no hard-coded secrets. |
| NFR-07 | Accessibility | Labels, focus indication, keyboard controls, meaningful errors. |
| NFR-08 | Security | Firestore rules reject unauthorized project/task access. |

# 13. Business Rules and Edge Cases

- Only registered users can be added as members; duplicate members are
  rejected.

- Owner cannot remove themselves from a project without
  deleting/transferring ownership (transfer is out of scope).

- Deleting a project must also handle its tasks; Firestore does not
  automatically delete subcollections. A documented safe cleanup
  strategy or deletion restriction is acceptable for MVP.

- Deleting an assigned user from membership must revoke their access;
  owner should unassign their tasks.

- Task status values and priority values must be restricted to
  enumerated options.

- Overdue means due date before the current date in the application
  timezone and status not Done.

- If a referenced project no longer exists, show not-found rather than
  crash.

- A non-member direct URL visit must produce access denied, not reveal
  data.

# 14. Seven-Day Implementation Plan

| Day | Focus | End-of-day deliverable |
|----|----|----|
| 1 | Requirements, wireframes, repo, Firestore schema | Repository, page sketches, README outline |
| 2 | Next.js layout and responsive UI | Login/dashboard/project screens with mock data |
| 3 | Firebase Auth, Firestore and rules | Working registration/login and protected access |
| 4 | Projects and tasks CRUD | Persistent project/task operations |
| 5 | Membership, assignment, search and filters | Working collaboration and discovery features |
| 6 | Security tests, responsiveness, bug fixing | Test evidence and polished app |
| 7 | Deploy, documentation and demo | Live URL, GitHub URL, final presentation |

Priority order if time runs short: authentication → project CRUD → task
CRUD → security rules → responsive layout → assignment/filtering → bonus
features. The trainee must report incomplete functionality
transparently.

# 15. Test Plan and Sample Test Cases

| Test  | Scenario                          | Expected result                    |
|-------|-----------------------------------|------------------------------------|
| TC-01 | Register with valid inputs        | Account and profile created        |
| TC-02 | Register with invalid email       | Validation error                   |
| TC-03 | Log in and refresh                | Session remains active             |
| TC-04 | Open dashboard signed out         | Redirect to login                  |
| TC-05 | Create project                    | Project persists after refresh     |
| TC-06 | Update project as member          | Operation denied                   |
| TC-07 | Add existing member               | Member sees project                |
| TC-08 | Add unknown user                  | Clear error; no invalid membership |
| TC-09 | Create task without title         | Validation prevents save           |
| TC-10 | Change task status                | Correct state persists             |
| TC-11 | Filter high-priority tasks        | Only matching tasks shown          |
| TC-12 | Search title keyword              | Correct matching tasks shown       |
| TC-13 | Open foreign project URL          | No data disclosed                  |
| TC-14 | Attempt forbidden Firestore write | Security rules reject operation    |
| TC-15 | Mobile width 375px                | No broken or clipped core controls |
| TC-16 | Simulate network failure          | Visible error and no false success |

# 16. Submission Package

- Public or evaluator-accessible GitHub repository with meaningful
  commits.

- Deployed application URL and safe demo credentials for at least two
  roles.

- README: overview, features, setup, environment variables, Firestore
  structure, rules, and known limitations.

- Firebase security rules file or documented configuration included in
  repository.

- At least five screenshots or a short walkthrough covering
  authentication, projects, tasks, filters and mobile.

- A 5-minute live demo and 10–15-minute individual code review.

# 17. Assessment Rubric (100 Points)

| Category | Points | Evidence |
|----|----|----|
| JavaScript & React | 20 | Components, hooks, state, validation and event handling |
| Next.js | 15 | Routing, layout, structure and rendering choices |
| Firebase | 20 | Authentication, Firestore CRUD and effective security rules |
| HTML & CSS | 15 | Semantics, responsive layout and usability |
| Git & GitHub | 10 | Commit history, repository hygiene and README |
| Functionality & Quality | 10 | Working MVP, error handling and test results |
| Presentation & Understanding | 10 | Live explanation, troubleshooting and code comprehension |

Scoring guidance: 90–100 Excellent; 80–89 Very Good; 70–79 Good; 60–69
Needs Improvement; below 60 Requires Intensive Support. Evaluators
should record evidence for each score, not rely solely on visual
appearance.

# 18. Live Evaluation Exercise

During the individual review, request a 30-minute change: add an
“Overdue Tasks” filter that shows incomplete tasks with a due date
before today. The trainee must explain the filtering condition,
demonstrate a passing example and edge case, and commit the change. This
can be assessed within the existing Presentation & Understanding /
Functionality categories; do not add points beyond 100.

# 19. Optional Bonus Features

- Drag-and-drop Kanban board.

- Dark mode with persisted preference.

- Simple task progress chart.

- Activity history for task changes.

- Sorting by deadline or priority.

Bonus features should distinguish excellent implementations only after
the MVP is complete; they must not compensate for broken authentication,
missing CRUD, or insecure Firestore rules.

# 20. Definition of Done

- Core screens load and navigation works.

- Two users can demonstrate owner/member roles and appropriate access
  control.

- Projects and tasks persist after reload.

- Required task properties, search and filtering work.

- No sensitive secrets in repository; Firebase rules tested with
  unauthorized account.

- Application works on mobile and desktop; deployment link is live.

- README and demo instructions are complete; evaluator can reproduce the
  workflow.

# Appendix A. Suggested Demo Data

Users: owner@example.test (Owner), member@example.test (Member).
Project: Website Redesign. Tasks: Build navbar (In Progress, High);
Create login page (To Do, Medium); Test responsive layout (Done, Low);
Fix overdue bug (To Do, High, due yesterday). Use Firebase Auth to
create test users; example.test addresses are placeholders, not
functioning accounts.

# Appendix B. Evaluator Observation Sheet

| Item                       | Score / Notes |
|----------------------------|---------------|
| Trainee name / ID          |               |
| Repository / deployment    |               |
| Core requirements met      |               |
| Unauthorized access test   |               |
| Live change exercise       |               |
| Code ownership explanation |               |
| Total / 100                |               |
| Recommended next training  |               |

Document status: Assessment specification / educational project.
Requirements are proposed for the training challenge and are not a
description of an existing deployed product.
