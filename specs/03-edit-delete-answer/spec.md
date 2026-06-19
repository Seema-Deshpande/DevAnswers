# Spec 03 — Edit & Delete Answer (frontend)

## Summary

The backend supports editing and deleting answers (`PUT /api/answers/:answerId`, `DELETE /api/answers/:answerId`, owner-or-admin enforced in `updateAnswerService` / `deleteAnswerService`), and `config/config.js` declares `ANSWER_API.UPDATE/DELETE`. The **frontend doesn't use them**: no `answerService.updateAnswer/deleteAnswer`, no thunks, no UI in `AnswerList`. This feature adds the frontend slice so an answer's author can edit or delete their answer inline on the question detail page. It mirrors Spec 02 for answers.

## User stories

- As the author of an answer, I want to edit its text, so I can correct or improve it.
- As the author of an answer, I want to delete my answer, so I can remove it.
- As a non-author, I must not see edit/delete controls on answers I don't own.

## Acceptance criteria

1. **Given** the logged-in user authored an answer (`answer.author._id === userInfo.userId`), **then** "Edit" and "Delete" controls render on that answer card in `AnswerList`; for other answers they do not render.
2. **Edit:** activating "Edit" turns the answer body into a textarea pre-filled with `answerText`; saving dispatches an update thunk → `PUT /api/answers/:answerId` with `{ answerText }` and the auth header; on success the card shows the updated text and exits edit mode without a page reload.
3. **Delete:** activating "Delete" asks for confirmation; confirming dispatches a delete thunk → `DELETE /api/answers/:answerId` with the auth header; on success the answer is removed from the list and the answer count in the header decrements.
4. The update thunk patches the matching answer inside `currentQuestion.answers` in the slice (same locate-by-`_id` pattern as `voteAnswer.fulfilled`); the delete thunk removes it from that array.
5. **Given** the backend returns `403` or `404`, **then** the thunk rejects with the server message and the UI surfaces it; no crash.
6. Empty `answerText` is blocked client-side before dispatching an edit, with a visible message.

## API contract (already implemented backend-side — no backend change)

- `PUT /api/answers/:answerId` (auth, owner/admin) → `{ success, message, data: <updatedAnswer populated author> }`
- `DELETE /api/answers/:answerId` (auth, owner/admin) → `{ success, message, data }` (message only; see Open questions).
- Authorization failures: `403 "Not authorized to update/delete this answer"`; missing: `404 "Answer not found"`.

Note: `updateAnswerService` returns the answer **populated** with `author.name` — safe to patch directly into state (no re-fetch needed, unlike questions).

## Data model

No changes.

## Frontend impact (layered)

- **Service** (`src/services/answerService.js`): add
  - `updateAnswer(answerId, answerText, token)` → `PUT ANSWER_API.UPDATE(answerId)` with `{ answerText }`, returns `res.data.data`.
  - `deleteAnswer(answerId, token)` → `DELETE ANSWER_API.DELETE(answerId)`, returns `res.data.data`.
  Match the existing `upvoteAnswer/downvoteAnswer` pattern (token header, unwrap).
- **Slice** (`src/reducers/questionSlice.js`): add `editAnswer` and `removeAnswer` thunks reading `token` from `getState().user.userInfo`, with `rejectWithValue`. `editAnswer.fulfilled` patches the answer in `currentQuestion.answers` by `_id`; `removeAnswer.fulfilled` filters it out (pass the deleted `answerId` through `meta.arg`).
- **UI** (`src/components/Answer/AnswerList.jsx`): owner-gated Edit/Delete per answer card (`AnswerList` already has `userInfo` via `useSelector`); inline textarea edit; confirm-before-delete (Bootstrap modal). The `answers` and `question` props are already passed in.

## Validation, auth & errors

- Owner-gated UI via `answer.author._id === userInfo.userId`. As in Spec 02, **admins won't see the buttons** (frontend `userInfo` lacks `isAdmin`); backend still authorizes admins. Known limitation.
- Write calls send `Authorization: Bearer <token>`.

## Out of scope

- Editing the AI summary or re-summarizing after edits.
- Optimistic concurrency / conflict handling.

## Test plan

- **Frontend unit** (`tests/unit/components/AnswerList.test.jsx`): controls show only for the author's answers; edit pre-fills and dispatches with `{ answerText }`; delete confirms then dispatches.
- **Frontend integration** (`tests/integration/answerFlow.test.jsx`): with MSW handlers for `PUT`/`DELETE /answers/:id` (currently absent — add them), editing updates the card text and deleting removes the card and decrements the count.
- Backend already covered by `tests/integration/answers.test.js`.

## Open questions / assumptions

- **Decision:** `deleteAnswerService` returns no `data` payload (just success). The slice keys removal off `meta.arg.answerId`, not the response body.
- **Decision:** confirm-before-delete via Bootstrap modal, consistent with Spec 02.
