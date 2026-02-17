# Tasks: Phase II Full-Stack Setup

**Feature**: Phase II Full-Stack Todo App
**Plan**: [specs/1-phase-ii-setup/plan.md](plan.md)
**Status**: In Progress (23/27 tasks complete)

## Implementation Strategy
We follow an MVP-first approach, prioritizing User Onboarding (Auth) and Basic Task CRUD. Each user story is designed to be an independently testable unit.

## Dependency Graph
- Phase 1 (Setup) -> Phase 2 (Foundational)
- Phase 2 -> Phase 3 (US1: Auth)
- Phase 3 -> Phase 4 (US2: CRUD)
- Phase 4 -> Phase 5 (US3: Isolation)

## Phase 1: Setup
Initial project structure and environment.

- [X] T001 Initialize backend with `uv` in `backend/`
- [X] T002 [P] Initialize frontend with Next.js in `my-app/`
- [X] T003 Configure Neon PostgreSQL environment variables in `backend/.env`
- [X] T004 Create `backend/pyproject.toml` with FastAPI and SQLModel dependencies

## Phase 2: Foundational
Database models and core utilities needed across all stories.

- [X] T005 [P] Implement User model in `backend/app/models.py`
- [X] T006 [P] Implement Task model in `backend/app/models.py`
- [X] T007 Setup database engine and session handler in `backend/app/db.py`
- [X] T008 Implement JWT verification utility in `backend/app/auth/jwt.py`

## Phase 3: User Story 1 - Secure User Onboarding (Priority: P1)
Goal: Register and login via Better Auth.

- [X] T009 [US1] Configure Better Auth server in `backend/app/main.py`
- [X] T010 [US1] Implement registration endpoint in `backend/app/routes/auth.py`
- [X] T011 [US1] Implement login endpoint in `backend/app/routes/auth.py`
- [X] T012 [P] [US1] Setup Better Auth client in `frontend/src/lib/auth.ts`
- [X] T013 [US1] Create Login and Signup pages in `frontend/app/auth/`
- [X] T014 [US1] Add middleware to protect `frontend/app/dashboard/`

## Phase 4: User Story 2 - Basic Task Management (Priority: P1)
Goal: Full CRUD for tasks.

- [X] T015 [US2] Implement GET `/tasks` endpoint in `backend/app/routes/tasks.py`
- [X] T016 [US2] Implement POST `/tasks` endpoint in `backend/app/routes/tasks.py`
- [X] T017 [US2] Implement PATCH `/tasks/{id}` endpoint in `backend/app/routes/tasks.py`
- [X] T018 [US2] Implement DELETE `/tasks/{id}` endpoint in `backend/app/routes/tasks.py`
- [X] T019 [P] [US2] Create API client for tasks in `frontend/src/lib/auth.ts`
- [X] T020 [US2] Build Task List component in `frontend/app/dashboard/page.tsx`
- [X] T021 [US2] Build Create Task form in `frontend/app/dashboard/page.tsx`

## Phase 5: User Story 3 - Multi-User Isolation (Priority: P1)
Goal: Ensure data privacy.

- [X] T022 [US3] Add `user_id` filter to all task queries in `backend/app/routes/tasks.py`
- [X] T023 [US3] Implement ownership check middleware in `backend/app/auth/guards.py`
- [X] T024 [US3] Add error handling for unauthorized task access in `backend/app/main.py`

## Phase 6: Polish & Cross-Cutting Concerns
- [ ] T025 [P] Implement optimistic updates for task toggles in `frontend/app/dashboard/page.tsx`
- [X] T026 Add loading states to all async operations in `frontend/app/dashboard/page.tsx`
- [ ] T027 Conduct final integration test for multi-user scenarios
