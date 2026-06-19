---
description: Turn a spec (or feature) into an ordered, layered implementation plan
argument-hint: <path to spec, or feature description>
allowed-tools: Read, Grep, Glob, Write
---

You are producing an **implementation plan** for the DevAnswers project (see `CLAUDE.md`). Do **not** write implementation code yet.

Input: **$ARGUMENTS**

## Steps

1. **Load the source.** If the argument is a path under `specs/` (a `spec.md`), read it. Otherwise treat it as a feature description and infer the spec; if no spec exists, suggest running `/spec` first but proceed with a best-effort plan.
2. **Map against the codebase.** Read the relevant existing files so the plan reuses current patterns (layered backend, Redux/services frontend, `{ success, message, data }` responses, `createAppError`, endpoints in `config/config.js`).
3. **Write the plan** to `specs/<NN>-<kebab-slug>/plan.md` (same feature folder as its `spec.md`). Order tasks **bottom-up by layer** so each step is testable on its own:

   **Backend** (only the layers the feature needs):
   1. Model — schema/field changes in `models/`
   2. Service — business logic + Mongoose queries in `services/` (`<action>Service`, throw `createAppError`)
   3. Controller — thin handler returning the standard response shape
   4. Route — path + `authenticate` where needed; register in `routes/index.js`
   5. Backend tests — unit (service/controller) + integration (supertest)

   **Frontend** (only what's needed):
   1. Endpoint(s) in `config/config.js`
   2. Service wrapper in `services/` (unwrap `res.data.data`)
   3. Slice thunk(s) in `reducers/` with `rejectWithValue`; register in `store.js` if new
   4. Components/pages + co-located CSS
   5. Frontend tests — unit + MSW-backed integration

4. For **each task** give: the exact file path, what changes, and a one-line "done when" check. Flag risks, migrations, or ordering constraints. List every file to create vs. edit.
5. End with the file path and a short summary. Recommend `/implement <plan path>` next.
