# Spec 01 — Bookmark Questions for Later  *(Assignment Feature 1)*

## Summary

Let a logged-in user **bookmark** (save) questions and revisit them from a "Saved Questions" section on their profile. A bookmark control appears on every question surface (feed cards and the question detail page), shows saved vs. not-saved state, toggles without a page reload, requires auth, is per-user, and renders the correct state on app load for an authenticated session.

This is a new vertical slice: persistence on the backend (`User.bookmarks`), three REST endpoints, a shared `BookmarkButton`, a `bookmark` Redux slice, and a profile section reusing the existing question-list UI.

## User stories

- As a logged-in user, I want to bookmark a question from the feed or its detail page, so I can find it again later.
- As a logged-in user, I want to unsave a bookmarked question, so my saved list stays relevant.
- As a logged-in user, I want a "Saved Questions" area on my profile listing everything I've saved, so I have one place to revisit them.
- As an anonymous visitor, I should not be able to save questions (consistent with posting/voting).

## Acceptance criteria

1. **Control everywhere:** every question shows a bookmark control in both the feed/list (`QuestionCard`) and on the detail page (`QuestionContent`).
2. **Clear state:** the control visibly distinguishes saved vs. not-saved (filled `FaBookmark` vs. outline `FaRegBookmark`).
3. **Toggle, no reload:** **given** a logged-in user, **when** they click the control, **then** the question's saved state flips and the icon updates immediately via Redux (no full page reload). Clicking a not-saved question saves it; clicking a saved one unsaves it.
4. **Auth required:** **given** an anonymous visitor, **when** they click the control, **then** nothing is saved and they get the same prompt pattern as voting (`alert("You must be logged in to bookmark a question.")`); the backend endpoints reject unauthenticated calls with `401`.
5. **Per-user isolation:** one user's saved set never appears for, or is affected by, another user. Two different users have independent saved lists.
6. **Profile list:** the profile page has a "Saved Questions" section that renders the user's saved questions using the **existing question-list UI** (`QuestionList`). Each item links to the question (`/question/:id`) and can be unsaved from there (its bookmark control works as anywhere else); unsaving removes it from the list without a reload.
7. **Empty state:** when the user has no saved questions, the profile shows a friendly empty state (e.g. "No saved questions yet.") instead of the list.
8. **State on load:** on app load (or right after login) with a valid session, the app fetches the user's saved set so every bookmark icon renders in the correct saved/not-saved state immediately — the user does not have to interact first.
9. **Logout:** logging out clears the in-memory saved set so a subsequent anonymous view shows no saved state.
10. All new backend responses use the standard `{ success, message, data }` shape; errors go through `errorHandler` via `createAppError`.

## Edge cases

- **Save an already-saved question** → idempotent: `200`, set unchanged (no duplicate). Backend uses `$addToSet`.
- **Unsave a not-saved question** → idempotent: `200`, no error. Backend uses `$pull`.
- **Bookmark a non-existent question id** (valid ObjectId, no such doc) → `404 "Question not found"`.
- **Malformed question id** (not an ObjectId) → `404 "Question not found"` (guard with `mongoose.isValidObjectId`), never `500`.
- **A bookmarked question is later deleted** → it must not break the saved list: `getSavedQuestions` populates and **filters out null (deleted) questions** so the list stays valid even though the id may linger in `User.bookmarks`.
- **Saved-while-logged-out race:** the control never dispatches a save when `userInfo` is absent (guard in `BookmarkButton`).
- **Self-bookmark is allowed:** unlike voting, a user *may* bookmark their own question (no author guard).

## API contract (new — all under `/api`, all require `authenticate`)

| Method | Path | Body | Success `data` |
|---|---|---|---|
| `POST` | `/questions/:id/bookmark` | — | `{ questionId, bookmarked: true }` |
| `DELETE` | `/questions/:id/bookmark` | — | `{ questionId, bookmarked: false }` |
| `GET` | `/questions/saved` | — | `[ <question>, … ]` (same populated shape as the feed: `author{_id,name}`, `tags`, `answerCount`), most-recently-saved first |

- Auth header: `Authorization: Bearer <token>`; missing/invalid → `401`.
- `POST`/`DELETE` errors: `404 "Question not found"` (missing/malformed id).
- **Route ordering (critical):** declare `GET /questions/saved` **before** `GET /questions/:id` in `routes/questions.js`, or Express matches `saved` as an `:id` and returns 404/cast errors.

## Data model

`models/User.js` — add:
```js
bookmarks: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }], default: [] }
```
No other schema changes. (Array-on-User mirrors the existing `upvotes`/`downvotes` array pattern and makes "is saved" / "list mine" trivial. A separate `Bookmark` collection is the scalable alternative — see Open questions.)

## Backend impact (layered)

- **Model** — `User.bookmarks` (above).
- **Service** — new `src/services/bookmarkService.js`:
  - `addBookmark(userId, questionId)` — validate id + question exists (`createAppError("Question not found", 404)`), `User.findByIdAndUpdate(userId, { $addToSet: { bookmarks: questionId } })`.
  - `removeBookmark(userId, questionId)` — `$pull`.
  - `getSavedQuestions(userId)` — `User.findById(userId).populate({ path:"bookmarks", populate:[{path:"author",select:"name"},{path:"tags"}] })`; reverse to newest-first; filter nulls; attach `answerCount` per question via `Answer.countDocuments` (reuse the pattern in `getAllQuestionsService`).
- **Controller** — new `src/controllers/bookmarkController.js`: `bookmarkQuestion`, `unbookmarkQuestion`, `getSavedQuestions`, reading `req.user.id` + `req.params.id`, returning the standard shape.
- **Routes** — in `src/routes/questions.js`: `GET /saved` (before `/:id`), `POST /:id/bookmark`, `DELETE /:id/bookmark`, all behind `authenticate`.

## Frontend impact (layered)

- **Config** (`src/config/config.js`) — add `QUESTION_API.BOOKMARK = (id) => `/questions/${id}/bookmark`` and `QUESTION_API.SAVED = "/questions/saved"`.
- **Service** (`src/services/questionService.js`) — `addBookmark(id, token)` [POST], `removeBookmark(id, token)` [DELETE], `getSavedQuestions(token)` [GET], all unwrapping `res.data.data` with the auth header (mirror `upvoteQuestion`).
- **Slice** — new `src/reducers/bookmarkSlice.js` registered in `store.js`. State `{ savedIds: [], savedQuestions: [], status: 'idle', error: null }`. Thunks `fetchSavedQuestions`, `addBookmark(questionId)`, `removeBookmark(questionId)` (token from `getState().user.userInfo`, `rejectWithValue`). On `fetchSavedQuestions.fulfilled` set `savedQuestions = payload` and `savedIds = payload.map(q=>q._id)`. **`savedIds` is the authoritative source for icon state everywhere**, so `addBookmark.fulfilled` pushes the id and `removeBookmark.fulfilled` removes it (and also filters `savedQuestions` by id, which works since removal needs only the id). The full `savedQuestions` list (needed for the profile UI) is (re)hydrated by `fetchSavedQuestions`, not reconstructed on add — see the profile note. Add a `clearBookmarks` reducer for logout.
- **Shared component** — new `src/components/Shared/BookmarkButton.jsx`: props `{ questionId }`; reads `savedIds` + `userInfo`; `isSaved = savedIds.includes(questionId)`; renders filled/outline icon; on click `e.preventDefault/stopPropagation`, auth-guard (alert if logged out), else dispatch add/remove. Mirrors `VoteButtons`' guard style.
- **Surfaces** — render `<BookmarkButton questionId={question._id} />` in `QuestionCard.jsx` and `QuestionContent.jsx`.
- **Profile** (`src/pages/Profile/Profile.jsx`) — add a "Saved Questions" section. Dispatch `fetchSavedQuestions()` on mount so the full list is fresh (covers questions saved from the feed since app load); read `savedQuestions`; if empty show the empty-state message, else render `<QuestionList questions={savedQuestions} />`. Unsaving from this list removes the item (the slice filters `savedQuestions` on `removeBookmark.fulfilled`).
- **Bootstrap on load/login** (`src/App.jsx`) — add a `useEffect` keyed on `userInfo` that dispatches `fetchSavedQuestions()` when authenticated and `clearBookmarks()` on logout (requires wiring `useSelector`/`useDispatch` into `App`).

## Validation, auth & errors

- All three endpoints require `authenticate`; `req.user.id` is the only user identity used (never a client-supplied id) → guarantees per-user isolation.
- Service throws `createAppError`; invalid/missing question → `404`, never `500`.
- Frontend write calls send `Authorization: Bearer <token>`; `BookmarkButton` blocks dispatch when logged out.

## File list

**Backend** — create: `src/services/bookmarkService.js`, `src/controllers/bookmarkController.js`, `tests/unit/services/bookmarkService.test.js`, `tests/integration/bookmark.test.js`. Edit: `src/models/User.js`, `src/routes/questions.js`.
**Frontend** — create: `src/reducers/bookmarkSlice.js`, `src/components/Shared/BookmarkButton.jsx`, `tests/unit/components/BookmarkButton.test.jsx`, `tests/integration/bookmarkFlow.test.jsx`. Edit: `src/config/config.js`, `src/services/questionService.js`, `src/store.js`, `src/components/Question/QuestionCard.jsx`, `src/components/Question/QuestionContent.jsx`, `src/pages/Profile/Profile.jsx`, `src/App.jsx`, `tests/mocks/handlers.js`, `tests/mocks/mockData.js`, `tests/unit/pages/profile.test.jsx`.

## Test plan

- **Backend unit** (`bookmarkService.test.js`): add (idempotent, 404 on bad/missing id), remove (idempotent), getSaved (populated shape, `answerCount`, newest-first order, null/deleted filtering).
- **Backend integration** (`bookmark.test.js`): POST/DELETE/GET with a token; `401` without; `404` malformed id; **per-user isolation** (user A's save invisible to user B); save→GET reflects it, delete→GET drops it.
- **Frontend unit**: `BookmarkButton` renders filled when `savedIds` contains the id and outline otherwise, alerts + no dispatch when logged out, dispatches add/remove when logged in; `bookmarkSlice` reducers; Profile shows empty state with none saved and `QuestionList` when some saved.
- **Frontend integration** (`bookmarkFlow.test.jsx`, new MSW handlers): toggling a card's icon updates state; profile lists saved; unsaving from profile removes the item.

## Out of scope / open questions

- **Cascade cleanup (optional):** extending `deleteQuestionService` to `$pull` the deleted question from all users' `bookmarks`. Not required because `getSavedQuestions` already filters deleted (null) questions; flagged as a nice-to-have for data hygiene.
- **Storage choice:** array-on-`User` is chosen for simplicity/consistency. A dedicated `Bookmark { user, question, createdAt }` collection would scale better and give exact saved-time ordering — revisit if bookmark volume grows. (Current ordering relies on `$addToSet` append order, reversed.)
- **Anonymous control rendering:** the control is shown to everyone but blocks the action when logged out (parity with `VoteButtons`), rather than being hidden. Confirm this matches the desired UX; hiding it for anonymous users is a trivial alternative.
