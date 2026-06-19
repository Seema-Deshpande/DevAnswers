# Plan 03 — Edit & Delete Answer (frontend)

Implements [`spec.md`](./spec.md). **Frontend-only** — backend `PUT/DELETE /api/answers/:answerId` already exist. Mirrors Plan 02 for answers. Build bottom-up: service → slice → UI → tests.

## Files

**Edit:** `src/services/answerService.js`, `src/reducers/questionSlice.js`, `src/components/Answer/AnswerList.jsx`, `tests/unit/components/AnswerList.test.jsx`, `tests/integration/answerFlow.test.jsx`, `tests/mocks/handlers.js`.

## Steps (bottom-up)

1. **Service** `src/services/answerService.js` — add (mirror `upvoteAnswer`):
   ```js
   export const updateAnswer = async (answerId, answerText, token) => {
     const res = await axiosInstance.put(ANSWER_API.UPDATE(answerId), { answerText }, {
       headers: { Authorization: `Bearer ${token}` },
     });
     return res.data.data;
   };
   export const deleteAnswer = async (answerId, token) => {
     const res = await axiosInstance.delete(ANSWER_API.DELETE(answerId), {
       headers: { Authorization: `Bearer ${token}` },
     });
     return res.data.data;
   };
   ```
   `ANSWER_API.UPDATE/DELETE` already exist in `config/config.js`.

2. **Slice** `src/reducers/questionSlice.js` — add two thunks near `voteAnswer`:
   - `editAnswer = createAsyncThunk('question/editAnswer', async ({ answerId, answerText }, { getState, rejectWithValue }) => { try { const token = getState().user.userInfo?.token; return await updateAnswer(answerId, answerText, token); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message || 'Failed to update answer'); } })`
     - `updateAnswerService` returns the **populated** answer, so patch state directly (no re-fetch).
   - `removeAnswer = createAsyncThunk('question/removeAnswer', async (answerId, { getState, rejectWithValue }) => { try { const token = getState().user.userInfo?.token; await deleteAnswer(answerId, token); return answerId; } catch (e) { return rejectWithValue(...); } })`
   - Import `updateAnswer, deleteAnswer` from the service.
   - extraReducers (reuse the locate-by-`_id`-in-`currentQuestion.answers` pattern from `voteAnswer.fulfilled`):
     - `editAnswer.fulfilled` → find by `action.payload._id`, replace its `answerText` (and other returned fields).
     - `removeAnswer.fulfilled` → `state.currentQuestion.answers = state.currentQuestion.answers.filter(a => a._id !== action.payload)`.
     - add `rejected` cases setting `state.error`.

3. **UI** `src/components/Answer/AnswerList.jsx` (already has `userInfo` via `useSelector` and `dispatch`):
   - Per answer: `const isOwner = userInfo && answer.author?._id === userInfo.userId;`
   - When `isOwner`, render small "Edit"/"Delete" buttons in the answer card meta row.
   - Edit: toggle a per-answer editing state (e.g. `editingId`), swap the `answer.answerText` div for a controlled `textarea` seeded with it; "Save" validates non-empty then `dispatch(editAnswer({ answerId: answer._id, answerText }))`, on success clear `editingId`; "Cancel" reverts.
   - Delete: Bootstrap `Modal` confirm → `dispatch(removeAnswer(answer._id))`.
   - Surface rejection via an `Alert` or `alert()` (match the existing `handleSummarize` error style).
   - **Done when:** controls show only on the author's own answers; edit updates the card text; delete removes the card and the header count (`answers.length`) decrements.

4. **MSW handlers** `tests/mocks/handlers.js` — add (currently absent):
   - `http.put(`${BASE_URL}/answers/:id`, …)` → `{ data: { _id, answerText, author, voteCount, upvotes, downvotes } }`.
   - `http.delete(`${BASE_URL}/answers/:id`, …)` → `{ data: {} }` (message-only; removal keys off the dispatched id).

5. **Tests.**
   - `tests/unit/components/AnswerList.test.jsx`: controls only on owned answers; edit pre-fills textarea and dispatches `{ answerId, answerText }`; delete confirms then dispatches.
   - `tests/integration/answerFlow.test.jsx`: editing updates the displayed text; deleting removes the answer and decrements the count.

## Order & verification

Service → slice → MSW → UI → tests. `cd devanswers-frontend && npm test`. Manual: as the answer author, edit and delete an answer on a question detail page; confirm count updates and non-authors see no controls.

## Risks / decisions

- **Admins won't see controls** (no `isAdmin` in `userInfo`) — accepted; backend still authorizes.
- Delete removal is keyed off `meta.arg`/returned id, since `deleteAnswerService` sends no answer body.
- Keep edit textarea validation consistent with `AnswerForm`.
