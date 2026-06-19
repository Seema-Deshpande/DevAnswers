# DevAnswers — Specs & Plans

Spec-driven deliverables for the Week-11 graded project. Each feature has its own folder containing a **`spec.md`** (precise, testable requirements — Stage 2) and, once written, a **`plan.md`** (ordered, bottom-up implementation plan — Stage 3). Features were chosen from the gap analysis in the approved exploration plan: the starter code is ~95% complete and green (400/403 tests), and these close the real gaps.

| # | Feature | Type | Closes |
|---|---|---|---|
| [01](01-user-profile-stats/spec.md) | User Profile Stats | Full-stack | Missing `GET /api/auth/stats/:userId`; `Profile.jsx` used a bug-masking direct `axios` call |
| [02](02-edit-delete-question/spec.md) | Edit & Delete Question | Frontend | Backend PUT/DELETE exist but no frontend service/thunk/UI |
| [03](03-edit-delete-answer/spec.md) | Edit & Delete Answer | Frontend | Backend PUT/DELETE exist but no frontend service/thunk/UI |
| [04](04-profile-update/spec.md) | Profile Update | Full-stack | `Profile.jsx` submit was a `setTimeout` stub; no `User` fields / endpoint |

## Cross-cutting decisions (apply to all specs)

- **Conventions** follow `CLAUDE.md`: backend `routes → controllers → services → models`, `{ success, message, data }` responses, `createAppError`; frontend `page → thunk → service → axiosInstance`, endpoints in `config/config.js`, `rejectWithValue`.
- **Frontend ownership gating is advisory** — the backend owner/admin check is authoritative. Because login stores only `{ token, userId, name }` (no `isAdmin`), admin-only UI affordances are not shown to admins; they still act via the API. (Specs 02, 03.)
- **Shared files** `Profile.jsx` and `userSlice.js` are touched by Specs 01 and 04 — sequence them in planning to avoid churn.

## Known bugs (handled during Implement/Verify, not specced as features)

- **Bug A** — flaky tags sort (`tests/integration/tags.test.js`): add tiebreaker `.sort({ createdAt: -1, _id: -1 })` in `getQuestionsByTagService` (and `getAllQuestionsService`). Gets the suite to 234/234.
- **Bug B** — `voteService.handleVote` throws a raw `Error` (→500) for a missing document; should be `createAppError("Document not found", 404)`.

## Pipeline

`/spec` → review & tighten → `/plan-feature` → `/implement` → `/review` → test & verify. See `.claude/commands/`.
