# Plan 02 — Edit & Delete Question (frontend)

Implements [`spec.md`](./spec.md). **Frontend-only** — backend `PUT/DELETE /api/questions/:id` already exist. Build bottom-up: service → slice → UI → tests.

## Files

**Edit:** `src/services/questionService.js`, `src/reducers/questionSlice.js`, `src/components/Question/QuestionContent.jsx`, `src/pages/Question/QuestionDetail.jsx` (only if delete-navigation needs it), `tests/unit/components/QuestionContent.test.jsx`, `tests/integration/questionFlow.test.jsx`, `tests/mocks/handlers.js`.
**Create:** none (optionally a small `ConfirmModal` if not reusing inline).

## Steps (bottom-up)

1. **Service** `src/services/questionService.js` — add (mirror `createQuestion`):
   ```js
   export const updateQuestion = async (id, questionData, token) => {
     const res = await axiosInstance.put(QUESTION_API.UPDATE(id), questionData, {
       headers: { Authorization: `Bearer ${token}` },
     });
     return res.data.data;
   };
   export const deleteQuestion = async (id, token) => {
     const res = await axiosInstance.delete(QUESTION_API.DELETE(id), {
       headers: { Authorization: `Bearer ${token}` },
     });
     return res.data.data;
   };
   ```
   `QUESTION_API.UPDATE/DELETE` already exist in `config/config.js`.
   - **Done when:** functions exist and send the auth header + correct verb.

2. **Slice** `src/reducers/questionSlice.js` — add two thunks near `postQuestion`:
   - `editQuestion = createAsyncThunk('question/editQuestion', async ({ id, title, description, tags }, { getState, dispatch, rejectWithValue }) => { try { const token = getState().user.userInfo?.token; await updateQuestion(id, { title, description, tags }, token); return await dispatch(fetchQuestionById(id)).unwrap(); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message || 'Failed to update question'); } })`
     - Re-fetch via `fetchQuestionById` (per spec AC4) so `currentQuestion` regains populated `author`/`tags`/`answers`. `tags` is the **comma-separated string**.
   - `removeQuestion = createAsyncThunk('question/removeQuestion', async (id, { getState, rejectWithValue }) => { try { const token = getState().user.userInfo?.token; await deleteQuestion(id, token); return id; } catch (e) { return rejectWithValue(...); } })`
   - Import `updateQuestion, deleteQuestion` from the service.
   - extraReducers: `editQuestion.fulfilled` → `state.currentQuestion = action.payload` (the re-fetched question); `removeQuestion.fulfilled` → `state.currentQuestion = null` and `state.questions = state.questions.filter(q => q._id !== action.payload)`; add `rejected` cases setting `state.error`.
   - **Done when:** dispatching updates/removes state correctly (slice unit coverage).

3. **UI** `src/components/Question/QuestionContent.jsx`:
   - `const userInfo = useSelector((s) => s.user.userInfo);` and `const isOwner = userInfo && question.author?._id === userInfo.userId;`
   - When `isOwner`, render "Edit" and "Delete" buttons in the header card.
   - Local state: `isEditing`, plus controlled fields seeded from `question.title/description` and `question.tags.map(t => t.name).join(', ')`. In edit mode show a form (reuse field markup/classes from `PostQuestion`); "Save" validates non-empty title/description then `dispatch(editQuestion({ id: question._id, title, description, tags }))`, on success exit edit mode; "Cancel" reverts.
   - "Delete" opens a Bootstrap `Modal` confirm; confirming `await dispatch(removeQuestion(question._id)).unwrap()` then `navigate('/')` (`useNavigate`).
   - Surface rejection via an inline `Alert` (read thunk error or catch from `.unwrap()`).
   - **Done when:** owner sees controls, non-owner/logged-out does not; edit + delete flows work against MSW.

4. **MSW handlers** `tests/mocks/handlers.js` — add (currently absent):
   - `http.put(`${BASE_URL}/questions/:id`, …)` → returns `{ data: { ...updatedFields } }`.
   - `http.delete(`${BASE_URL}/questions/:id`, …)` → returns `{ data: { _id } }`.

5. **Tests.**
   - `tests/unit/components/QuestionContent.test.jsx`: controls visible for author, hidden otherwise; edit form pre-fills (tags joined by `, `); save dispatches with the comma-separated `tags` string; delete opens confirm then dispatches + navigates.
   - `tests/integration/questionFlow.test.jsx`: edit reflects new title/description; delete navigates home.

## Order & verification

Service → slice → MSW → UI → tests. `cd devanswers-frontend && npm test`. Manual: as the author, edit a question and confirm the detail view updates without reload; delete and confirm redirect to home; verify a non-author sees no controls.

## Risks / decisions

- **Admins won't see controls** (frontend `userInfo` lacks `isAdmin`) — accepted limitation per spec; backend still authorizes them.
- **Re-fetch after edit** is intentional (the `PUT` payload isn't populated). If later optimized, populate in `updateQuestionService` and patch state directly instead.
- Keep edit-form field names/validation identical to `PostQuestion` to avoid contract drift on `tags`.
