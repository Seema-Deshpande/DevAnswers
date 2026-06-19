# Plan 04 — Profile Update

Implements [`spec.md`](./spec.md). Full-stack. Build **backend first** (model → service → controller → route → tests), then frontend. **Sequence after Spec 01** — both touch `Profile.jsx` and `userSlice.js`; do stats first, then layer profile fetch/update onto the same effect.

## Files

**Edit (backend):** `src/models/User.js`, `src/services/userService.js`, `src/controllers/authController.js`, `src/routes/auth.js`, `tests/unit/services/userService.test.js`, `tests/integration/user.test.js`.
**Edit (frontend):** `src/config/config.js`, `src/services/authService.js`, `src/reducers/userSlice.js`, `src/pages/Profile/Profile.jsx`, `tests/unit/pages/profile.test.jsx`, `tests/mocks/handlers.js`.

## Backend (bottom-up)

1. **Model** `src/models/User.js`: add to the schema (before `timestamps`):
   ```js
   bio: { type: String, default: "" },
   location: { type: String, default: "" },
   website: { type: String, default: "" },
   ```
   Existing docs stay valid (defaults).

2. **Service** `src/services/userService.js`:
   - `getProfile(userId)`: `if (!mongoose.isValidObjectId(userId)) throw createAppError("User not found", 404);` then `const user = await User.findById(userId).select('-password'); if (!user) throw createAppError("User not found", 404); return user;`
   - `updateProfile(userId, { name, bio, location, website })`:
     - Validate: trimmed `name` non-empty → else `createAppError("Name is required", 400)`.
     - If `website` provided and non-empty, validate URL (`try { new URL(website) } catch { throw createAppError("Invalid website URL", 400); }`).
     - Whitelist fields (ignore anything else, never `email`/`password`/`isAdmin`): build `update` from only the four allowed keys that are defined.
     - `const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true }).select('-password'); if (!user) throw createAppError("User not found", 404); return user;`
   - **Done when:** unit tests pass (happy path, empty-name 400, bad-URL 400, password never returned, only whitelisted fields persisted).

3. **Controller** `src/controllers/authController.js`:
   ```js
   export const getProfile = async (req, res) => {
     const data = await getProfileService(req.user.id);
     res.status(200).json({ success: true, message: "Profile fetched successfully", data });
   };
   export const updateProfile = async (req, res) => {
     const { name, bio, location, website } = req.body;
     const data = await updateProfileService(req.user.id, { name, bio, location, website });
     res.status(200).json({ success: true, message: "Profile updated successfully", data });
   };
   ```
   Import the services (alias to `...Service`). Uses `req.user.id` — never a body/param id.

4. **Route** `src/routes/auth.js`:
   - `import authenticate from '../middleware/authHandler.js';`
   - `router.get('/profile', authenticate, getProfile);`
   - `router.put('/profile', authenticate, updateProfile);`
   - Place **before** any future `/:param` auth routes (none today). `/stats/:userId` (Spec 01) stays public and distinct.

5. **Tests.**
   - `tests/unit/services/userService.test.js`: `getProfile` found/not-found/no-password; `updateProfile` happy path, empty-name 400, invalid-URL 400, ignores `email`/`isAdmin` in body.
   - `tests/integration/user.test.js`: `GET /api/auth/profile` and `PUT /api/auth/profile` with a valid token (register+login to get one, as existing tests do) → 200; without token → 401; update round-trips (PUT then GET reflects change); password absent from responses.

## Frontend (after backend green)

6. **Config** `src/config/config.js` — extend `AUTH_API`:
   ```js
   PROFILE: "/auth/profile",
   ```
   (Used for both GET and PUT.)

7. **Service** `src/services/authService.js` — add:
   ```js
   export const getProfile = async (token) => {
     const res = await axiosInstance.get(AUTH_API.PROFILE, { headers: { Authorization: `Bearer ${token}` } });
     return res.data.data;
   };
   export const updateProfile = async (fields, token) => {
     const res = await axiosInstance.put(AUTH_API.PROFILE, fields, { headers: { Authorization: `Bearer ${token}` } });
     return res.data.data;
   };
   ```

8. **Slice** `src/reducers/userSlice.js`:
   - Import `getProfile, updateProfile`.
   - `initialState.profile = { data: null, status: 'idle', error: null }`.
   - `fetchProfile = createAsyncThunk('user/fetchProfile', async (_, { getState, rejectWithValue }) => { try { return await getProfile(getState().user.userInfo?.token); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message || 'Failed to load profile'); } })`
   - `updateProfile thunk 'user/updateProfile'`: same token source; on success return payload.
   - extraReducers: `fetchProfile.fulfilled` → `state.profile.data = action.payload`. `updateProfile.fulfilled` → `state.profile.data = action.payload`; **if** `action.payload.name !== state.userInfo?.name`, set `state.userInfo.name = action.payload.name` and `localStorage.setItem('userInfo', JSON.stringify(state.userInfo))` (keep the localStorage side-effect pattern used by `loginUser`). Add pending/rejected for both with `status`/`error`.

9. **Page** `src/pages/Profile/Profile.jsx`:
   - Remove `import axios` and the `setTimeout` stub.
   - On mount (authenticated), `dispatch(fetchProfile())`; when `profile.data` arrives, seed `formData` (name, email read-only, bio, location, website) via an effect.
   - Make the email `Form.Control` always `disabled` (read-only) even in edit mode.
   - `handleSubmit`: client-validate (name non-empty, website URL if present), then `await dispatch(updateProfile({ name, bio, location, website })).unwrap()`; show success Alert + exit edit mode; on reject show the error Alert and stay editing. Bind the Save spinner to the thunk `status === 'pending'`.
   - **Done when:** form pre-fills from the server, save persists and reflects, header name updates on change.

10. **MSW + test** `tests/mocks/handlers.js`: add `GET` and `PUT /auth/profile` handlers returning the documented shapes. Update `tests/unit/pages/profile.test.jsx`: form pre-fills from `fetchProfile`; submit dispatches `updateProfile` with whitelisted fields; email read-only; success/error Alerts driven by thunk state.

## Order & verification

Model → service → controller → route → backend tests → config → service → slice → page → frontend test.
- `cd devanswers-backend && npm test`; `cd devanswers-frontend && npm test`.
- Manual: log in, open `/profile`, edit name/bio/location/website, save; confirm persistence on reload and the header name updates.

## Risks / decisions

- **Controller name clash** with Spec 01's `getUserStats` import — alias all service imports consistently (`...Service`).
- **Shared-file ordering:** implement Spec 01's `Profile.jsx`/`userSlice.js` changes first, then add the profile fetch/update onto the same effect & slice to avoid merge churn.
- Email intentionally read-only; do not wire it into the PUT body.
- `runValidators: true` so schema constraints apply on update.
