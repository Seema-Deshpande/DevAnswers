# Spec 02 — Edit Your Own Questions and Answers  *(Assignment Feature 2)*

## Summary

Let an **author** edit the content of their own questions and answers, **only on the individual question page**. Questions: title, description, tags. Answers: answer text. Edits persist, show immediately without a reload, restrict to the author (UI **and** server), and an edited post displays an **"edited" indicator**. **Deletion is out of scope.**

The backend already exposes `PUT /api/questions/:id` and `PUT /api/answers/:answerId` with owner/admin checks (`updateQuestionService` / `updateAnswerService`). What's missing: an `isEdited` flag + content validation on the backend, and the entire frontend edit affordance/flow.

## User stories

- As the author of a question, I want to edit its title/description/tags from the question page, so I can correct or improve it.
- As the author of an answer, I want to edit its text in place on the question page, so I can fix it.
- As any user, I want edited posts marked "edited", so I know the content changed since posting.
- As a non-author, I must never see an edit affordance on content I didn't write, and the server must reject such an edit.

## Acceptance criteria

1. **Location:** edit affordances appear **only on the individual question page** (`QuestionContent` for the question, `AnswerList` for answers) — **never** on the home feed/`QuestionCard` or any list view.
2. **Affordance:** the author sees a small **pencil icon** (`FaPencilAlt` / `FaEdit`), not a full "Edit" button, on their own question and on each of their own answers.
3. **Question edit:** activating the question's pencil reveals a form pre-filled with the current **title, description, and tags** (tags shown as the comma-separated names). Saving dispatches `PUT /api/questions/:id` with `{ title, description, tags }` (tags as a comma-separated **string**) + `Authorization: Bearer <token>`; on success the updated content shows immediately (no reload) and the form closes.
4. **Answer edit:** activating an answer's pencil turns its body into a textarea pre-filled with the current text. Saving dispatches `PUT /api/answers/:answerId` with `{ answerText }`; on success the answer updates in place.
5. **Author-only (UI):** the pencil renders only when `post.author._id === userInfo.userId`. Not shown to other users or anonymous visitors.
6. **Author-only (server):** a non-author edit is rejected with `403` (existing owner check); the thunk surfaces the message and the UI does not change the content.
7. **"Edited" indicator:** after a successful content edit, the post shows an "edited" indicator (e.g. "(edited)"). A post never edited does **not** show it. This is driven by a new boolean `isEdited` on the model — **not** `updatedAt`, because voting also bumps `updatedAt`.
8. **Pre-fill + cancel:** the edit form starts populated with current content; "Cancel" discards changes and restores the read-only view with the original content.
9. **Validation:** saving blank/invalid content is prevented — empty (whitespace-only) title or description for a question, empty answer text for an answer. Blocked client-side (inline message, no dispatch) **and** rejected server-side with `400`.
10. **No regressions:** existing question/answer/auth/vote/AI flows and all existing tests continue to pass. Voting a post does **not** flip its `isEdited` flag or show "edited".

## Edge cases

- **Whitespace-only input** → treated as empty → blocked client-side + `400` server-side.
- **Voting after/around edits** → `isEdited` only flips on a content update, never on a vote (`handleVote` does not touch it).
- **Tags on edit** → sent as a comma-separated string (matches `updateQuestionService`'s `tags.trim().split(",")`); the create flow's contract is reused.
- **Concurrent stale view** → last write wins (no optimistic-concurrency control; out of scope).
- **Admin** → backend allows admin edits, but the frontend pencil keys off authorship only (`userInfo` has no `isAdmin`), so admins won't see the UI affordance — consistent, documented limitation.

## API contract

Both endpoints already exist (auth + owner/admin enforced). **Changes:** responses now include `isEdited: true` after an edit; both add `400` for empty content.

| Method | Path | Body | Success `data` |
|---|---|---|---|
| `PUT` | `/api/questions/:id` | `{ title, description, tags }` | updated question (`isEdited: true`) |
| `PUT` | `/api/answers/:answerId` | `{ answerText }` | updated answer, populated author (`isEdited: true`) |

Errors: `400` (empty title/description/answerText), `401` (no/invalid token), `403` (not author), `404` (not found).

## Data model

- `models/Question.js`: add `isEdited: { type: Boolean, default: false }`.
- `models/Answer.js`: add `isEdited: { type: Boolean, default: false }`.
New posts default `false`. Existing documents read as `false` (default applies on read).

## Backend impact (layered)

- **Models** — add `isEdited` (above).
- **Service** `updateQuestionService` (`src/services/questionService.js`): at the top, validate `title`/`description` non-empty (trimmed) → else `createAppError("Title and description are required", 400)`; include `isEdited: true` in the `findByIdAndUpdate` `$set`.
- **Service** `updateAnswerService` (`src/services/answerService.js`): validate `answerText` non-empty (trimmed) → else `createAppError("Answer text is required", 400)`; set `answer.isEdited = true` before `save()`.
- Routes/controllers unchanged (already wired).

## Frontend impact (layered)

- **Config** — `QUESTION_API.UPDATE(id)` and `ANSWER_API.UPDATE(answerId)` already exist; no change.
- **Services** — `src/services/questionService.js`: `updateQuestion(id, questionData, token)` (`PUT`). `src/services/answerService.js`: `updateAnswer(answerId, answerText, token)` (`PUT`). Both auth header, unwrap `res.data.data`.
- **Slice** `src/reducers/questionSlice.js`:
  - `editQuestion` thunk → calls `updateQuestion`, then `dispatch(fetchQuestionById(id)).unwrap()` to refresh `currentQuestion` with populated `author`/`tags`/`answers` (the `PUT` payload isn't populated). `fulfilled` → set `currentQuestion`.
  - `editAnswer` thunk → calls `updateAnswer` (returns populated answer); `fulfilled` → patch the matching answer in `currentQuestion.answers` by `_id` (reuse the `voteAnswer.fulfilled` locate pattern).
  - both `rejectWithValue` with the server message.
- **UI** `src/components/Question/QuestionContent.jsx`: owner-gated pencil; inline edit form (title input, description textarea, tags input pre-filled from `question.tags.map(t=>t.name).join(', ')`); client validation; Save → `editQuestion`; Cancel restores; render "(edited)" when `question.isEdited`.
- **UI** `src/components/Answer/AnswerList.jsx`: per-answer owner-gated pencil; inline textarea edit (per-answer `editingId`); client validation; Save → `editAnswer`; Cancel restores; render "(edited)" when `answer.isEdited`.

## File list

**Backend** — edit: `src/models/Question.js`, `src/models/Answer.js`, `src/services/questionService.js`, `src/services/answerService.js`, `tests/unit/services/questionService.test.js`, `tests/unit/services/answerService.test.js`, `tests/integration/questions.test.js`, `tests/integration/answers.test.js`.
**Frontend** — edit: `src/services/questionService.js`, `src/services/answerService.js`, `src/reducers/questionSlice.js`, `src/components/Question/QuestionContent.jsx`, `src/components/Answer/AnswerList.jsx`, `tests/mocks/handlers.js`, `tests/unit/components/QuestionContent.test.jsx`, `tests/unit/components/AnswerList.test.jsx`, `tests/integration/questionFlow.test.jsx`, `tests/integration/answerFlow.test.jsx`.

## Test plan

- **Backend unit:** `updateQuestionService`/`updateAnswerService` set `isEdited: true`; reject empty content with `400`; non-author still `403`; not-found `404`.
- **Backend integration:** `PUT` round-trips set `isEdited` and reflect in a subsequent `GET`; empty body → `400`; non-author → `403`. Add an assertion that an **upvote does not set `isEdited`** (guards AC10).
- **Frontend unit:** pencil shows only for author (question + answer); edit form pre-fills; Save dispatches with correct args (tags comma-string / `answerText`); Cancel restores; "(edited)" renders from `isEdited`.
- **Frontend integration:** edit a question/answer via MSW (`PUT` handlers returning `isEdited: true`) → content + indicator update without reload.

## Out of scope

- Deleting questions/answers. Editing another user's content. Edit history/diffs. Optimistic-concurrency conflict handling. Exposing `isAdmin` to the frontend.
