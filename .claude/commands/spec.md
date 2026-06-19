---
description: Turn a feature idea into a precise, reviewable specification
argument-hint: <feature description>
allowed-tools: Read, Grep, Glob, Write
---

You are writing a **feature specification** for the DevAnswers project (see `CLAUDE.md`). Do **not** write implementation code.

Feature to spec: **$ARGUMENTS**

## Steps

1. **Understand the request.** Read `CLAUDE.md` and any directly relevant existing code (models, services, config, slices) so the spec fits current conventions and reuses what exists.
2. **Resolve ambiguity.** If anything material is unclear (scope, auth rules, data shape, edge cases), ask concise clarifying questions before writing. If the request is clear, state the 2-3 assumptions you're making and proceed.
3. **Write the spec** to `specs/<NN>-<kebab-slug>/spec.md` (next free number, zero-padded; one folder per feature, shared with its plan). Use this structure:

   - **Title & summary** — one paragraph: what and why.
   - **User stories** — `As a <role>, I want <goal> so that <benefit>.`
   - **Acceptance criteria** — numbered, testable, Given/When/Then where useful.
   - **API contract** (if backend is touched) — for each endpoint: method, path (under `/api`), auth required?, request body, success response in the standard `{ success, message, data }` shape, and error cases with status codes.
   - **Data model changes** — new/changed Mongoose fields, types, defaults, indexes, relationships.
   - **Frontend impact** — config endpoints, services, slice/thunk changes, pages/components affected.
   - **Validation, auth & errors** — who can do what; what's rejected and with which status.
   - **AI considerations** — only if Gemini is involved.
   - **Out of scope** — what this explicitly does not cover.
   - **Open questions** — anything still unresolved.

4. Keep it tight and concrete. Reference real file paths. End by printing the spec file path and a 3-bullet summary so the user can run `/plan-feature` next.

This spec is a graded deliverable: a reviewer should be able to read it and understand exactly what will be built and why.
