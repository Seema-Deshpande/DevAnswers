---
description: Add or extend tests in the project's Vitest style
argument-hint: <file, feature, or area to cover>
---

You are writing **tests** for the DevAnswers project (see `CLAUDE.md`). Match the existing test files closely.

Target: **$ARGUMENTS**

## Approach

1. **Find the right place and pattern.** Identify whether this is backend or frontend, and unit vs. integration. Read 1-2 neighbouring tests in the matching folder and copy their structure, imports, and helpers.
   - **Backend** `devanswers-backend/tests/`: `unit/` mirrors `src/` (services, controllers, middleware, utils); `integration/` drives routes with **supertest** against the **in-memory MongoDB** from `tests/setup.js`.
   - **Frontend** `devanswers-frontend/tests/`: `unit/` (components/pages/reducers/store) + `integration/` flows using **@testing-library/react** and **MSW** mocks in `tests/mocks/`.
2. **Cover what matters:** happy path, validation/auth failures, error/`createAppError` paths and status codes, and edge cases (empty lists, missing records, unauthorized). For the standard API shape assert `success`, `message`, and `data`.
3. **Run them.** `npm test` in the relevant app. Iterate until green. If a test reveals a real bug, report it — don't silently weaken the assertion to pass.
4. Summarize what you covered and the pass/fail result.
