# DevAnswers — Specs & Plans

Spec-driven deliverables for the Week-11 graded project. Each feature has its own folder with a **`spec.md`** (precise, testable requirements — Stage 2) and a **`plan.md`** (ordered, bottom-up implementation plan — Stage 3).

## Assignment features

| # | Feature | Type | Spec | Plan |
|---|---|---|---|---|
| 1 | Bookmark Questions for Later | Full-stack | [spec](01-bookmark-questions/spec.md) | [plan](01-bookmark-questions/plan.md) |
| 2 | Edit Your Own Questions & Answers (editing only — **no delete**) | Full-stack | [spec](02-edit-questions-answers/spec.md) | [plan](02-edit-questions-answers/plan.md) |

## Cross-cutting conventions (per `CLAUDE.md`)

- **Backend:** `routes → controllers → services → models`, `{ success, message, data }` envelope, `createAppError`. New endpoints respect existing auth (`authenticate`, `req.user.id`).
- **Frontend:** `config/config.js endpoint → services → Redux slice → component`; services unwrap `res.data.data`; thunks use `rejectWithValue`.
- **Don't break what works:** existing question/answer/auth/vote/AI flows and both test suites must stay green. New tests are written tests-first but are not themselves a graded deliverable.

## Key design decisions

- **Bookmarks** persist as `User.bookmarks: [Question]` (mirrors the `upvotes/downvotes` array pattern). Per-user isolation is automatic (server only uses `req.user.id`). Route ordering: `GET /questions/saved` is declared **before** `GET /questions/:id`.
- **"Edited" indicator** uses a dedicated `isEdited` boolean on Question/Answer — **not** `updatedAt`, because voting also bumps `updatedAt`. It flips only on a content edit.
- **Edit affordances** are a pencil icon, shown only to the author, only on the individual question page (`QuestionContent` / `AnswerList`) — never on the feed.

## Scope notes

- **Out of scope** (per problem statement): deleting questions/answers; bookmarking answers; folders/tags/notes/sharing/export of saved questions.
- **Pre-existing fix folded in:** the flaky tags-sort test (sub-ms `createdAt` ties) gets a `_id` tiebreaker so the existing suite stays reliably green.

## Pipeline

`/spec` → review & tighten → `/plan-feature` → `/implement` → `/review` → test & verify. Commands live in `.claude/commands/`.
