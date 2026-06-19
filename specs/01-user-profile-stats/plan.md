# Plan 01 — User Profile Stats

Implements [`spec.md`](./spec.md). Build **backend first** (tests-first), then the frontend rewire. No schema changes.

## Files

**Create:** none.
**Edit (backend):** `src/services/userService.js`, `src/controllers/authController.js`, `src/routes/auth.js`, `tests/unit/services/userService.test.js`, `tests/integration/user.test.js`.
**Edit (frontend):** `src/services/authService.js`, `src/reducers/userSlice.js`, `src/pages/Profile/Profile.jsx`, `tests/unit/pages/profile.test.jsx`, `tests/mocks/handlers.js` (keep mock in sync).

## Backend (bottom-up)

1. **Service — `getUserStats(userId)`** in `src/services/userService.js`.
   - Add imports: `Question` (`../models/Question.js`), `Answer` (`../models/Answer.js`). `mongoose` and `createAppError` are already imported.
   - Guard: `if (!mongoose.isValidObjectId(userId)) throw createAppError("User not found", 404);`
   - `const user = await User.findById(userId); if (!user) throw createAppError("User not found", 404);`
   - `const totalQuestions = await Question.countDocuments({ author: userId });`
   - `const totalAnswers = await Answer.countDocuments({ author: userId });`
   - `const [q, a] = await Promise.all([Question.find({ author: userId }).select("upvotes"), Answer.find({ author: userId }).select("upvotes")]);`
   - `const totalVotesReceived = [...q, ...a].reduce((s, d) => s + d.upvotes.length, 0);`
   - `const reputation = totalQuestions * 5 + totalAnswers * 10 + totalVotesReceived * 10;`
   - `return { totalQuestions, totalAnswers, totalVotesReceived, reputation };`
   - **Done when:** unit tests for counts, upvote-sum, reputation, zero-user, not-found, and invalid-id pass.

2. **Controller — `getUserStats`** in `src/controllers/authController.js` (mirror `login`/`register`):
   ```js
   export const getUserStats = async (req, res) => {
     const data = await getUserStats Service(req.params.userId); // import as e.g. fetchUserStats
     res.status(200).json({ success: true, message: "User stats fetched successfully", data });
   };
   ```
   Import the service (alias to avoid name clash, e.g. `getUserStats as getUserStatsService`).
   - **Done when:** controller unit test (if added) and the route work end-to-end.

3. **Route** in `src/routes/auth.js`: `router.get('/stats/:userId', getUserStats);` — **public**, no `authenticate`. Update the import line.
   - **Done when:** `GET /api/auth/stats/:id` returns the documented shape.

4. **Tests.**
   - `tests/unit/services/userService.test.js`: seed via models; assert all four fields + reputation; `totalVotesReceived` sums upvotes only (push a couple user ids into `upvotes`); zero case returns zeros; unknown id → throws 404; malformed id → throws 404 (no CastError/500).
   - `tests/integration/user.test.js`: create user + questions/answers (some with `upvotes`), `GET /api/auth/stats/:userId` → 200 + values; unknown ObjectId → 404 `"User not found"`; non-ObjectId string → 404 (not 500).

## Frontend (after backend is green)

5. **Service** `src/services/authService.js`: add
   ```js
   export const getUserStats = async (userId) => {
     const res = await axiosInstance.get(USER_API.STATS(userId));
     return res.data.data;
   };
   ```
   Import `USER_API` from `../config/config.js`.

6. **Slice** `src/reducers/userSlice.js`:
   - Add `import { getUserStats } from '../services/authService.js';`
   - Extend `initialState` with `stats: { data: { totalQuestions: 0, totalAnswers: 0, totalVotesReceived: 0, reputation: 0 }, status: 'idle', error: null }` (matches the per-concern shape used by `login`/`registration`).
   - Add `fetchUserStats = createAsyncThunk('user/fetchUserStats', async (userId, { rejectWithValue }) => { try { return await getUserStats(userId); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message || 'Failed to load stats'); } })`.
   - extraReducers: `pending` → status 'pending'; `fulfilled` → `state.stats.data = action.payload; status 'fulfilled'`; `rejected` → status 'rejected', keep zeros, set error.

7. **Page** `src/pages/Profile/Profile.jsx`:
   - Remove `import axios` and the local `stats` `useState` + `fetchUserStats` axios function.
   - `const dispatch = useDispatch();` and `const { data: stats } = useSelector((s) => s.user.stats);`
   - In the existing effect, replace `fetchUserStats()` with `dispatch(fetchUserStats(userInfo.userId))`.
   - Stat cards already read `stats.totalQuestions` etc. — no markup change.
   - **Done when:** the page renders values from the slice; no direct axios import remains.

8. **MSW + test.** `tests/mocks/handlers.js` already returns the correct shape (`:169`) — leave as-is. Update `tests/unit/pages/profile.test.jsx` so the stat cards assert the mocked values and the page dispatches the thunk.

## Order & verification

Service → controller → route → backend tests → frontend service → slice → page → frontend test.
- `cd devanswers-backend && npm test` (target: still green + new cases).
- `cd devanswers-frontend && npm test`.
- Manual: log in, open `/profile`, confirm the four cards show real counts.

## Risks

- **Name clash:** the controller imports a service named `getUserStats` while the controller fn is also `getUserStats` — alias the import (`getUserStats as getUserStatsService`).
- Keep the MSW mock shape identical to the real contract or the frontend test becomes a false positive.
