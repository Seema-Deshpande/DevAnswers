# Spec 02 — Edit & Delete Question (frontend)

## Summary

The backend already supports editing and deleting a question (`PUT /api/questions/:id`, `DELETE /api/questions/:id`, owner-or-admin enforced in `updateQuestionService` / `deleteQuestionService`), and the endpoints are declared in `config/config.js` (`QUESTION_API.UPDATE/DELETE`). But the **frontend never uses them**: there is no `questionService.updateQuestion/deleteQuestion`, no slice thunks, and no UI. This feature adds the missing frontend vertical slice so a question's author can edit or delete it from the question detail page.

## User stories

- As the author of a question, I want to edit its title, description, and tags, so I can fix or improve it.
- As the author of a question, I want to delete my question, so I can remove it; deletion also removes its answers (backend cascades via `deleteQuestionService`).
- As a non-author, I must not see edit/delete controls for a question I don't own.

## Acceptance criteria

1. **Given** the logged-in user is the question's author (`question.author._id === userInfo.userId`), **when** they view the question detail page, **then** "Edit" and "Delete" controls are visible on the question (`QuestionContent`).
2. **Given** the user is not the author or is logged out, **then** no edit/delete controls render for that question.
3. **Edit:** activating "Edit" reveals an editable form pre-filled with the current title, description, and tags (tags as the comma-separated names, matching `PostQuestion`'s input format). Saving dispatches an update thunk → `PUT /api/questions/:id` with `{ title, description, tags }` and the `Authorization: Bearer <token>` header. **`tags` is sent as a comma-separated string**, because `updateQuestionService` does `tags.trim().split(",")` (same contract as create) — not an array.
4. On successful edit, the question detail view reflects the new title/description/tags **without a full page reload**, and the editing form closes. (Because the backend `PUT` response may not be populated with `author`/`tags`/`answers`, the thunk re-fetches the question via `fetchQuestionById` to refresh `currentQuestion` cleanly — see Open questions.)
5. **Delete:** activating "Delete" asks for confirmation; confirming dispatches a delete thunk → `DELETE /api/questions/:id` with the auth header, then navigates to `/` (home).
6. **Given** the backend returns `403` (not owner) or `404`, **then** the thunk rejects with the server message via `rejectWithValue` and the UI surfaces it (alert/inline error); no crash.
7. Empty title or description is blocked client-side before dispatch (parity with create), with a visible validation message.

## API contract (already implemented backend-side — no backend change)

- `PUT /api/questions/:id` (auth, owner/admin) → `{ success, message, data: <updatedQuestion> }`
- `DELETE /api/questions/:id` (auth, owner/admin) → `{ success, message, data: <deletedQuestion> }`
- Authorization failures: `403 "Not authorized to update/delete this question"`; missing: `404 "Question not found"`.

## Data model

No changes.

## Frontend impact (layered)

- **Service** (`src/services/questionService.js`): add
  - `updateQuestion(id, questionData, token)` → `PUT QUESTION_API.UPDATE(id)`, returns `res.data.data`.
  - `deleteQuestion(id, token)` → `DELETE QUESTION_API.DELETE(id)`, returns `res.data.data`.
  Follow the existing pattern (token header, unwrap `res.data.data`).
- **Slice** (`src/reducers/questionSlice.js`): add `editQuestion` and `removeQuestion` `createAsyncThunk`s. Read `token`/`userId` from `getState().user.userInfo`; `rejectWithValue(error.response?.data?.message || error.message || "...")`. `editQuestion.fulfilled` re-fetches or patches `currentQuestion`; `removeQuestion.fulfilled` clears `currentQuestion` and removes it from `questions[]`.
- **UI** (`src/components/Question/QuestionContent.jsx`): owner-gated Edit/Delete buttons; inline edit form (reuse field styles from `PostQuestion`); a confirm step before delete (Bootstrap modal or `window.confirm`). Navigation on delete via `useNavigate`.
- (Optional) mirror owner-gated controls on `QuestionCard` in the list — **out of scope** for this spec to keep it focused; detail page only.

## Validation, auth & errors

- **Ownership in the UI is advisory only** — the source of truth is the backend owner/admin check. Frontend gates on `author._id === userInfo.userId`. Note: `userInfo` does not store `isAdmin` (login returns only `{ token, userId, name }`), so **admin users won't see the buttons in the UI**; they can still edit/delete via API. Documented as a known limitation.
- All write calls send `Authorization: Bearer <token>`.

## Out of scope

- Edit/delete controls in the question list/home cards.
- Optimistic UI; we re-fetch instead.
- Exposing `isAdmin` to the frontend (would require changing the login response — separate change).

## Test plan

- **Frontend unit** (`tests/unit/components/QuestionContent.test.jsx`): buttons show for author, hidden for non-author/logged-out; edit form pre-fills; save dispatches with correct args; delete triggers confirm then dispatch+navigate.
- **Frontend integration** (`tests/integration/questionFlow.test.jsx`): with MSW handlers for `PUT`/`DELETE /questions/:id`, edit updates the displayed question; delete navigates home. Add the two MSW handlers (currently absent).
- Backend already covered by `tests/integration/questions.test.js`.

## Open questions / assumptions

- **Assumption:** after edit, re-fetch the question (`fetchQuestionById`) rather than trusting the `PUT` payload, since `updateQuestionService` returns the doc from `findByIdAndUpdate` which may lack populated `author`/`tags` and the `answers` array the detail view needs. Confirm during planning whether to instead populate in the backend response (small backend tweak) — re-fetch is the lower-risk default.
- **Decision:** confirm-before-delete via Bootstrap modal (consistent with the React-Bootstrap UI) rather than `window.confirm`.
