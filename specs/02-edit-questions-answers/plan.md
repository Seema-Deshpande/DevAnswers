# Plan 02 — Edit Your Own Questions and Answers

Implements [`spec.md`](./spec.md). Backend update endpoints already exist; we add `isEdited` + validation, then build the frontend edit affordances. Build backend first.

## Backend (bottom-up)

1. **Models** — add `isEdited: { type: Boolean, default: false }` to `src/models/Question.js` and `src/models/Answer.js`.

2. **Service** `updateQuestionService` (`src/services/questionService.js`):
   - First line of the body: `if (!title?.trim() || !description?.trim()) throw createAppError("Title and description are required", 400);` (before the owner lookup is fine; keep after the not-found/403 checks is also acceptable — place validation right after the `403` check so auth errors take precedence).
   - In the `findByIdAndUpdate` update object add `isEdited: true`: `{ title, description, tags: tagIds, isEdited: true }`.

3. **Service** `updateAnswerService` (`src/services/answerService.js`):
   - After the `403` check: `if (!answerText?.trim()) throw createAppError("Answer text is required", 400);`
   - Before `await answer.save();` add `answer.isEdited = true;` (alongside `answer.answerText = answerText;`).

4. **Tests.**
   - `tests/unit/services/questionService.test.js` / `answerService.test.js`: edit sets `isEdited: true`; empty title/description/answerText → `400`; non-author → `403` (unchanged).
   - `tests/integration/questions.test.js` / `answers.test.js`: `PUT` round-trip sets `isEdited` and a follow-up `GET` shows it; empty body → `400`. **Add: upvote a post → `isEdited` stays `false`** (protects AC10).
   - Re-run existing update tests; adjust only if they relied on the absence of validation (they use valid data, so they should pass unchanged).

## Frontend (after backend green)

5. **Services:**
   - `src/services/questionService.js`: `updateQuestion(id, questionData, token)` → `axiosInstance.put(QUESTION_API.UPDATE(id), questionData, { headers: { Authorization: `Bearer ${token}` } })`, return `res.data.data`.
   - `src/services/answerService.js`: `updateAnswer(answerId, answerText, token)` → `PUT ANSWER_API.UPDATE(answerId)` with `{ answerText }`.

6. **Slice** `src/reducers/questionSlice.js`:
   - Import `updateQuestion` (questionService) and `updateAnswer` (answerService).
   - `editQuestion = createAsyncThunk('question/editQuestion', async ({ id, title, description, tags }, { getState, dispatch, rejectWithValue }) => { try { const token = getState().user.userInfo?.token; await updateQuestion(id, { title, description, tags }, token); return await dispatch(fetchQuestionById(id)).unwrap(); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message || 'Failed to update question'); } })` → `fulfilled` sets `state.currentQuestion = action.payload`.
   - `editAnswer = createAsyncThunk('question/editAnswer', async ({ answerId, answerText }, { getState, rejectWithValue }) => { try { const token = getState().user.userInfo?.token; return await updateAnswer(answerId, answerText, token); } catch (e) { return rejectWithValue(...); } })` → `fulfilled` finds the answer in `currentQuestion.answers` by `action.payload._id` and replaces `answerText` + `isEdited`.
   - Add `rejected` cases setting `state.error`.

7. **UI** `src/components/Question/QuestionContent.jsx`:
   - `const userInfo = useSelector(s => s.user.userInfo); const isOwner = userInfo && question.author?._id === userInfo.userId;`
   - When `isOwner` and not editing, show a pencil (`FaPencilAlt`) near the title.
   - Local `isEditing` + controlled `title`/`description`/`tags` seeded from the question (`tags` = `question.tags.map(t=>t.name).join(', ')`). Edit form: title `Form.Control`, description `textarea`, tags input. Save: validate non-empty title/description → `dispatch(editQuestion({ id: question._id, title, description, tags }))`, on success exit editing; Cancel resets to original + exit.
   - Render `{question.isEdited && <span className="...">(edited)</span>}` in the meta row.

8. **UI** `src/components/Answer/AnswerList.jsx`:
   - Per answer: `const isOwner = userInfo && answer.author?._id === userInfo.userId;`
   - `editingId` state; when an answer is being edited, swap its text for a controlled textarea seeded with `answer.answerText`; Save validates non-empty → `dispatch(editAnswer({ answerId: answer._id, answerText }))`, clears `editingId`; Cancel resets.
   - Owner-gated pencil in the answer meta row; render `(edited)` when `answer.isEdited`.

9. **MSW + tests.** `tests/mocks/handlers.js`: add `PUT /questions/:id` (return body merged + `isEdited: true`) and `PUT /answers/:id` (return updated answer + `isEdited: true`). Update `tests/unit/components/QuestionContent.test.jsx`, `AnswerList.test.jsx`, and the integration flows for: pencil visibility by author, pre-fill, dispatch args, cancel, and the "(edited)" indicator.

## Verification

`cd devanswers-backend && npm test`; `cd devanswers-frontend && npm test` — both green. Manual: as the author, edit own question (title/desc/tags) and own answer on the question page → updates show immediately, "(edited)" appears; vote a post → no "(edited)"; confirm a different user sees no pencils; empty content is blocked.

## Risks / decisions

- **`updatedAt` is not a reliable "edited" signal** (votes bump it) → dedicated `isEdited` flag is the core decision.
- **Re-fetch after question edit** (vs. trusting the un-populated `PUT` payload) keeps `currentQuestion` consistent.
- Validation placed after the `403` check so authorization errors take precedence over `400`.
- Pencils live only in `QuestionContent`/`AnswerList` (detail page) — never in `QuestionCard` — satisfying the "individual question page only" rule.
