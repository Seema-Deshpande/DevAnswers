# Spec 01 — User Profile Stats

## Summary

The Profile page (`devanswers-frontend/src/pages/Profile/Profile.jsx`) shows four activity stats — **Questions**, **Answers**, **Votes Received**, **Reputation** — by calling `GET /api/auth/stats/:userId`. That endpoint **does not exist on the backend**: `routes/auth.js` defines only `register` and `login`. The frontend tests pass only because MSW mocks the route (`tests/mocks/handlers.js:169`), so against the real API the stats silently fall back to zeros (the page swallows the error in `fetchUserStats`).

This feature implements the real backend endpoint and replaces the page's ad-hoc `axios.get` with the project's standard service → thunk → slice flow, so the stats are real and the code follows convention.

## User stories

- As a logged-in user, I want to see how many questions and answers I've posted and the votes I've received, so I can gauge my activity.
- As a logged-in user, I want a reputation score derived from my contributions, so I have a sense of standing.

## Acceptance criteria

1. **Given** a user with N questions, M answers, and a total of V net upvotes across them, **when** `GET /api/auth/stats/:userId` is called, **then** it responds `200` with `{ success: true, message, data: { totalQuestions: N, totalAnswers: M, totalVotesReceived: V, reputation: R } }`.
2. **totalVotesReceived** = the sum of `upvotes.length` across the user's questions and answers (upvotes *received* by the user's content, not votes the user cast). Downvotes do not reduce it.
3. **Reputation** `R = totalQuestions*5 + totalAnswers*10 + totalVotesReceived*10`, matching the formula shown in the Profile UI info banner (`Profile.jsx:296-304`). (Since "votes received" counts upvotes, the banner's "+10 per upvote" term equals `totalVotesReceived*10`.)
4. **Given** a `userId` that is a valid ObjectId but no such user exists, **then** the endpoint responds `404` with `{ success: false, message: "User not found" }`.
5. **Given** a malformed `userId` (not a valid ObjectId), **then** the endpoint responds `404 "User not found"` — never `500`. The service must guard with `mongoose.isValidObjectId(userId)` and throw `createAppError("User not found", 404)` before querying, because a raw `User.findById(badId)` would throw an unhandled `CastError` → `500` (the behavior seen in existing services like `getQuestionByIdService`). This spec deliberately improves on that.
6. A user with no questions/answers yields all-zero stats and `reputation: 0` with status `200` (not `404`).
7. The endpoint is **public** (no `authenticate`), matching the frontend which calls it without an `Authorization` header (`Profile.jsx:45`). Stats are non-sensitive aggregates.
8. **Frontend:** `Profile.jsx` no longer imports `axios` directly; it dispatches a thunk that calls a `userService.getUserStats(userId)` function and reads `{ stats, statsLoading }` from the `user` slice. On failure, stats remain zeros and an error is recorded (no crash, parity with current behavior).
9. The existing reputation/stat numbers continue to render in the four stat cards (`Profile.jsx:266-291`) with no markup change required.

## API contract

`GET /api/auth/stats/:userId` — **public**

Success `200`:
```json
{
  "success": true,
  "message": "User stats fetched successfully",
  "data": { "totalQuestions": 3, "totalAnswers": 5, "totalVotesReceived": 12, "reputation": 75 }
}
```
Errors: `404 { success:false, message:"User not found" }` (missing or malformed id).

## Data model

No schema changes. Stats are computed by aggregating existing collections:
- `Question` — `author`, `upvotes[]` (`models/Question.js`)
- `Answer` — `author`, `upvotes[]` (`models/Answer.js`)
- `User` — existence check (`models/User.js`)

## Backend impact (layered)

- **Route** — add `GET /stats/:userId` in `src/routes/auth.js` → `getUserStats` controller. (Public; no middleware.)
- **Controller** — `getUserStats` in `src/controllers/authController.js`: read `req.params.userId`, call service, return standard shape.
- **Service** — `getUserStats(userId)` in `src/services/userService.js`: verify user exists (`User.findById`, throw `createAppError("User not found", 404)`); count `Question.countDocuments({ author })` and `Answer.countDocuments({ author })`; compute `totalUpvotesReceived` by summing `upvotes.length` over the user's questions and answers (an aggregation or a `find(...).select('upvotes')` reduce); compute reputation; return the four-field object.

## Frontend impact (layered)

- **Service** — add `getUserStats(userId)` to the existing `src/services/authService.js` (the stats route lives under `/auth`), calling `axiosInstance.get(USER_API.STATS(userId))` and returning `res.data.data`. (`USER_API.STATS` already exists in `config/config.js:42`.)
- **Slice** — add `fetchUserStats` thunk + `stats`/`statsLoading` state to `src/reducers/userSlice.js`, using `rejectWithValue` per convention.
- **Page** — `Profile.jsx`: remove `import axios`, dispatch `fetchUserStats(userInfo.userId)` in the effect, read stats from the slice.

## Validation, auth & errors

- Public endpoint. `userId` validated by existence; invalid/missing → `404 "User not found"` (never `500`).
- Service throws `createAppError`; `errorHandler` formats the response.

## Out of scope

- Pagination or listing the actual questions/answers.
- Caching/denormalizing stats onto the `User` document.
- Showing another user's profile (only the logged-in user's `userId` is used today).
- Auth-protecting the endpoint.

## Test plan

- **Backend unit** (`tests/unit/services/userService.test.js`): counts, upvote summing, reputation math, zero case, user-not-found.
- **Backend integration** (`tests/integration/user.test.js`): seed user + questions/answers with upvotes, assert the four fields and reputation; assert `404` for unknown/malformed id.
- **Frontend** (`tests/unit/pages/profile.test.jsx`): with MSW returning the documented shape, the four cards render the values; the page uses the thunk (no direct axios). Keep the MSW handler shape in sync with the real contract above.

## Open questions / assumptions

- **Assumption:** "Votes received" counts upvotes only (per the reputation banner wording). If net score (`upvotes − downvotes`) is preferred, only the service reduce changes.
- **Assumption:** endpoint stays public to match the current frontend call; if it should be authenticated, add `authenticate` and send the token from `Profile.jsx`.
