# Plan 01 — Bookmark Questions for Later

Implements [`spec.md`](./spec.md). Build **backend first** (tests alongside), then frontend. Follows `routes → controllers → services → models` and `config → service → slice → component`.

## Backend (bottom-up)

1. **Model** `src/models/User.js` — add field:
   ```js
   bookmarks: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }], default: [] },
   ```

2. **Service** — new `src/services/bookmarkService.js`:
   - `import mongoose, User, Question, Answer, createAppError`.
   - `addBookmark(userId, questionId)`: `if (!mongoose.isValidObjectId(questionId)) throw createAppError("Question not found", 404)`; ensure `Question.exists({ _id: questionId })` else 404; `await User.findByIdAndUpdate(userId, { $addToSet: { bookmarks: questionId } })`; return `{ questionId, bookmarked: true }`.
   - `removeBookmark(userId, questionId)`: `await User.findByIdAndUpdate(userId, { $pull: { bookmarks: questionId } })`; return `{ questionId, bookmarked: false }`.
   - `getSavedQuestions(userId)`: `const user = await User.findById(userId).populate({ path: "bookmarks", populate: [{ path: "author", select: "name" }, { path: "tags" }] });` → `const saved = (user?.bookmarks || []).filter(Boolean).reverse();` (newest-saved first, drop deleted nulls); attach `answerCount` via `Answer.countDocuments({ questionId: q._id })` (reuse `getAllQuestionsService` pattern); return array of plain objects.

3. **Controller** — new `src/controllers/bookmarkController.js`: `bookmarkQuestion`, `unbookmarkQuestion`, `getSavedQuestions` reading `req.user.id` + `req.params.id`, returning `{ success, message, data }`.

4. **Routes** `src/routes/questions.js`:
   - Import the three controllers + `authenticate` (already imported).
   - **Add `router.get("/saved", authenticate, getSavedQuestions);` immediately after `router.get("/", ...)` and BEFORE `router.get("/:id", ...)`** (or `saved` is parsed as an `:id`).
   - In the protected block: `router.post("/:id/bookmark", authenticate, bookmarkQuestion);` and `router.delete("/:id/bookmark", authenticate, unbookmarkQuestion);`.

5. **Tests.**
   - `tests/unit/services/bookmarkService.test.js`: add (idempotent via `$addToSet`, 404 bad/missing id), remove (idempotent), getSaved (populated shape, `answerCount`, newest-first, null filtering).
   - `tests/integration/bookmark.test.js`: register+login for a token; `POST`/`DELETE`/`GET` happy paths; `401` without token; `404` malformed id; **per-user isolation** (user B never sees user A's saves).

## Frontend (after backend green)

6. **Config** `src/config/config.js` — in `QUESTION_API`: `SAVED: "/questions/saved"`, `BOOKMARK: (id) => `/questions/${id}/bookmark``.

7. **Service** `src/services/questionService.js` — add (mirror `upvoteQuestion`):
   - `addBookmark(id, token)` → `POST QUESTION_API.BOOKMARK(id)`.
   - `removeBookmark(id, token)` → `DELETE QUESTION_API.BOOKMARK(id)` (axios `delete` with `{ headers }`).
   - `getSavedQuestions(token)` → `GET QUESTION_API.SAVED`, return `res.data.data || []`.

8. **Slice** — new `src/reducers/bookmarkSlice.js`, registered as `bookmark` in `src/store.js`.
   - State `{ savedIds: [], savedQuestions: [], status: 'idle', error: null }`.
   - Thunks (token from `getState().user.userInfo`, `rejectWithValue`): `fetchSavedQuestions`, `addBookmark(questionId)`, `removeBookmark(questionId)`.
   - Reducer `clearBookmarks` → reset to empty (logout).
   - extraReducers: `fetchSavedQuestions.fulfilled` → `savedQuestions = payload; savedIds = payload.map(q => q._id)`. `addBookmark.fulfilled` → push id to `savedIds` (dedupe). `removeBookmark.fulfilled` → remove id from `savedIds` and `savedQuestions`.

9. **Shared component** — new `src/components/Shared/BookmarkButton.jsx`: props `{ questionId, className }`. `const { userInfo } = useSelector(s => s.user); const savedIds = useSelector(s => s.bookmark.savedIds); const isSaved = savedIds.includes(questionId);` On click: `e.preventDefault(); e.stopPropagation();` → if `!userInfo` `alert("You must be logged in to bookmark a question.")` and return; else `dispatch(isSaved ? removeBookmark(questionId) : addBookmark(questionId))`. Render `FaBookmark` (saved) / `FaRegBookmark` (not) from `react-icons/fa`, with `aria-label`/`title` and `aria-pressed={isSaved}`.

10. **Surfaces:** render `<BookmarkButton questionId={question._id} />` in `src/components/Question/QuestionCard.jsx` (stats column) and `src/components/Question/QuestionContent.jsx` (header card).

11. **Profile** `src/pages/Profile/Profile.jsx`: `dispatch(fetchSavedQuestions())` on mount (authenticated); read `savedQuestions` from `state.bookmark`; add a "Saved Questions" section — if empty render the friendly empty state (`"No saved questions yet."`), else `<QuestionList questions={savedQuestions} />`.

12. **Bootstrap** `src/App.jsx`: add `useDispatch`/`useSelector`; `useEffect` keyed on `userInfo` → if authenticated `dispatch(fetchSavedQuestions())`, else `dispatch(clearBookmarks())`. (Provider already wraps `App` in `main.jsx`.)

13. **MSW + tests.** `tests/mocks/handlers.js`: add `GET /questions/saved`, `POST` & `DELETE /questions/:id/bookmark`; `tests/mocks/mockData.js`: a couple saved questions. `tests/unit/components/BookmarkButton.test.jsx` (filled/outline by `savedIds`, alert+no-dispatch when logged out, dispatch when logged in) and `tests/integration/bookmarkFlow.test.jsx` (toggle updates icon; profile lists saved; unsave removes).

## Verification

`cd devanswers-backend && npm test` then `cd devanswers-frontend && npm test` — both green, no regressions. Manual: log in, bookmark from feed + detail (icon fills), open `/profile` → Saved Questions lists them; unsave → disappears; reload → state persists; log out → icons reset.

## Risks

- **Route ordering** (`/saved` before `/:id`) — the classic Express pitfall; covered in step 4.
- Keep saved-question objects shaped like the feed (`author{_id,name}`, `tags`, `answerCount`) so `QuestionCard`/`QuestionList` render unchanged.
