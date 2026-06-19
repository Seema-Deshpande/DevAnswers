# Spec 04 — Profile Update

## Summary

The Profile page's "Edit Profile" form (`Profile.jsx`) is a stub: `handleSubmit` runs a `setTimeout` that fakes success (`Profile.jsx:67-76`, marked `// TODO: ... Implement API call to update profile`). There is no backend profile-update endpoint, the `User` model lacks the `bio`/`location`/`website` fields the form edits, and the form's `email` field pre-fills from `userInfo?.email` which is **always undefined** (login stores only `{ token, userId, name }`). This feature makes the form real: it loads the user's current profile, lets them update editable fields, and persists via the backend.

## User stories

- As a logged-in user, I want to view and edit my profile (name, bio, location, website), so my account information is accurate.
- As a logged-in user, when I save, I want the change persisted and reflected immediately (including my name in the header).

## Scope decision

Editable: **name, bio, location, website**. **Email is read-only** (display only) — changing it requires uniqueness handling and re-auth, deferred. **Password** is out of scope. A user may only edit **their own** profile (driven by `req.user.id`, never a body/param id).

## Acceptance criteria

1. **Model:** `User` gains optional `bio` (String, default `""`), `location` (String, default `""`), `website` (String, default `""`). Existing documents remain valid (defaults apply).
2. **Load:** **Given** a logged-in user opens Profile, **when** the page mounts, **then** it fetches the current profile via `GET /api/auth/profile` (auth) and pre-fills name, email (read-only), bio, location, website. No more reliance on the non-existent `userInfo.email`.
3. **Save:** **Given** the user edits fields and submits, **then** the page dispatches an update thunk → `PUT /api/auth/profile` (auth) with `{ name, bio, location, website }`; on `200` it shows the existing success Alert, exits edit mode, and the displayed values reflect the saved data.
4. **Header consistency:** if `name` changed, the slice updates `userInfo.name` (and its `localStorage` copy) so `Header` shows the new name without re-login.
5. **Validation:** `name` is required and non-empty (server returns `400` otherwise); `website`, if non-empty, must be a valid URL (`400 "Invalid website URL"` otherwise). Client mirrors these with inline messages before dispatch.
6. **Auth:** both endpoints require a valid `Bearer` token; without one → `401` (existing `authenticate`). The server ignores any client-supplied id and updates `req.user.id`.
7. **Errors:** a failed save shows the existing danger Alert with the server message via `rejectWithValue`; the form stays in edit mode with entered values intact. The faked `setTimeout` path is removed.
8. Responses never include `password`.

## API contract (new)

`GET /api/auth/profile` — **auth**
```json
{ "success": true, "message": "Profile fetched successfully",
  "data": { "_id":"...", "name":"...", "email":"...", "bio":"", "location":"", "website":"", "profileImage":"...", "isAdmin": false, "createdAt":"...", "updatedAt":"..." } }
```

`PUT /api/auth/profile` — **auth**, body `{ name, bio?, location?, website? }`
```json
{ "success": true, "message": "Profile updated successfully", "data": { /* updated user, no password */ } }
```
Errors: `400` (empty name / invalid website URL), `401` (no/invalid token), `404` ("User not found" — token valid but user deleted).

## Data model

`models/User.js`: add `bio`, `location`, `website` (String, default `""`). No other changes.

## Backend impact (layered)

- **Route** (`src/routes/auth.js`): `GET /profile` and `PUT /profile`, both behind `authenticate`, → `getProfile` / `updateProfile` controllers.
- **Controller** (`src/controllers/authController.js`): `getProfile` returns the service result for `req.user.id`; `updateProfile` passes `req.user.id` + whitelisted `{ name, bio, location, website }` from `req.body` to the service. Standard response shape.
- **Service** (`src/services/userService.js`): `getProfile(userId)` → `User.findById(userId).select('-password')`, throw `createAppError("User not found", 404)` if absent. `updateProfile(userId, fields)` → validate name non-empty and website URL (throw `createAppError(..., 400)`), `User.findByIdAndUpdate(userId, whitelisted, { new: true, runValidators: true }).select('-password')`.

## Frontend impact (layered)

- **Service** (`src/services/authService.js`): `getProfile(token)` and `updateProfile(fields, token)` (auth header, unwrap `res.data.data`).
- **Slice** (`src/reducers/userSlice.js`): `fetchProfile` + `updateProfile` thunks (`rejectWithValue`); store `profile`/`profileLoading`. On `updateProfile.fulfilled`, if `name` changed, update `state.userInfo.name` and persist `userInfo` to `localStorage` (reuse the slice's existing localStorage helper).
- **Page** (`Profile.jsx`): remove the `setTimeout` stub and direct `axios`; dispatch `fetchProfile` on mount to fill the form; `handleSubmit` dispatches `updateProfile`; bind `loading`/`success`/`error` to thunk state; render `email` as read-only.

## Validation, auth & errors

- Server is authoritative; client validation is a UX mirror. Website validated with a URL check (e.g. `new URL()` / regex). All writes authenticated; user can only modify themselves.

## Out of scope

- Email change, password change, avatar/image upload, public profiles of other users, exposing `isAdmin` to the client.

## Test plan

- **Backend unit** (`tests/unit/services/userService.test.js`): `getProfile` (found / not found / no password), `updateProfile` (happy path, empty-name `400`, bad-URL `400`, persists only whitelisted fields).
- **Backend integration** (`tests/integration/user.test.js`): `GET/PUT /api/auth/profile` with and without token (`401`), update round-trips and reflects in a subsequent `GET`.
- **Frontend** (`tests/unit/pages/profile.test.jsx`): form pre-fills from `fetchProfile`; submitting dispatches `updateProfile` with whitelisted fields; success/error Alerts driven by thunk state; email field is read-only.

## Open questions / assumptions

- **Assumption:** keep `GET /api/auth/profile` token-based (own profile) rather than `/:userId`, since the page only ever needs the logged-in user's data. The separate stats endpoint (Spec 01) stays public and id-based; these are intentionally different.
- **Assumption:** if name is unchanged, no `localStorage`/header update is needed.
- **Dependency note:** Specs 01 and 04 both edit `Profile.jsx` and `userSlice.js`; sequence them in planning to avoid churn (stats first, then update, or combine the `Profile.jsx` rewrite once).
