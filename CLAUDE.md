# DevAnswers — Project Memory

A StackOverflow-style Q&A platform. Monorepo with two apps that run independently.

- **`devanswers-backend/`** — Express 5 REST API, MongoDB/Mongoose, JWT auth, Google Gemini AI.
- **`devanswers-frontend/`** — React 19 SPA, Redux Toolkit, React Router 7, Vite, Bootstrap.

Core domain: **Users** ask **Questions** (tagged with **Tags**) and post **Answers**. Questions and answers can be **upvoted/downvoted**. AI assists by improving question drafts and summarizing answers.

---

## Running things

**Backend** (`cd devanswers-backend`)
- `npm run dev` — start API with nodemon (needs `.env`; see `.env.example`)
- `npm start` — start API once
- `npm test` — Vitest (uses in-memory MongoDB, runs serially)
- `npm run populate` — seed the database

**Frontend** (`cd devanswers-frontend`)
- `npm run dev` — Vite dev server (expects API at `http://localhost:3000/api`)
- `npm run build` / `npm run preview`
- `npm test` — Vitest + Testing Library
- `npm run lint` — ESLint

Backend env vars: `PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRATION`, `GEMINI_API_KEY`. Never commit real secrets; `.env` is local-only.

---

## Backend conventions

**Layered architecture — keep responsibilities separate. Request flows:**
`routes/ → controllers/ → services/ → models/`

- **`routes/`** — define paths, attach `authenticate` middleware where auth is required, map to controller fns. Register new routers in `routes/index.js` under `/api`.
- **`controllers/`** — read `req` (params/body/`req.user`), call a service, send the response. **No business logic or DB access here.**
- **`services/`** — all business logic and Mongoose queries live here. Functions are named `<action>Service` (e.g. `createQuestionService`). Throw errors via `createAppError(message, statusCode)`.
- **`models/`** — Mongoose schemas.
- **`middleware/`** — `authHandler.js` (`authenticate`: verifies `Bearer` JWT, sets `req.user = { id, isAdmin }`), `errorHandler.js` (final error middleware).
- **`utils/`** — `createAppError.js`, `geminiClient.js` (`getAI`, `extractJSON`).

**Standard success response** (controllers always return this shape):
```js
res.status(200).json({ success: true, message: "…", data: <payload> });
```

**Errors:** throw `createAppError("Not found", 404)` from services; never build error responses by hand — `errorHandler` formats them as `{ success: false, message, ...(dev ? stack) }`. Controllers/services are `async`; thrown errors propagate to the error handler (Express 5 forwards async rejections).

**Auth:** protected routes use the `authenticate` middleware; read the user as `req.user.id`. Tokens are `Bearer <jwt>` in the `Authorization` header.

**AI:** Gemini calls go through `utils/geminiClient.js`. Existing features: improve a question draft, summarize answers.

## Frontend conventions

**Data flow:** `components/pages → Redux thunks (reducers/*Slice.js) → services/*.js → axiosInstance → API`

- **`config/config.js`** — every endpoint path lives here, grouped (`QUESTION_API`, `AUTH_API`, …). Add new endpoints here; never hardcode paths.
- **`api/axiosInstance.js`** — axios with `baseURL: http://localhost:3000/api`.
- **`services/*.js`** — thin axios wrappers; unwrap and return `res.data.data` (default to `[]`/`{}` as appropriate). Pass `token` and set `Authorization: Bearer ${token}` for protected calls.
- **`reducers/*Slice.js`** — Redux Toolkit slices. Async work uses `createAsyncThunk`; on failure `rejectWithValue(error.response?.data?.message || error.message || "<fallback>")`. State carries `loading`/`error`. Register slices in `store.js`.
- **`pages/`** route-level views, **`components/`** reusable UI (each in its own folder with a co-located `.css`), **`layouts/`** page shells.
- UI uses React-Bootstrap + `react-icons`. Theme handled via `themeSlice`.

---

## Testing conventions

- **Both apps use Vitest.**
- **Backend** (`tests/`): `unit/` mirrors `src/` (controllers, services, middleware, utils); `integration/` hits routes via **supertest** against an **in-memory MongoDB** (`mongodb-memory-server`, see `tests/setup.js`). Tests run serially (`fileParallelism: false`) with 60s timeouts.
- **Frontend** (`tests/`): `unit/` (components, pages, reducers, store) + `integration/` flows, using **@testing-library/react** and **MSW** (`tests/mocks/`) to mock the API. jsdom environment.
- When adding a feature, add tests in the matching folder following existing files.

---

## Spec-driven workflow (the pipeline)

Custom slash commands in `.claude/commands/` drive feature work in order:

1. **`/spec <feature>`** — write a precise spec → `docs/specs/`
2. **`/plan-feature <spec or feature>`** — turn the spec into a layered implementation plan → `docs/plans/`
3. **`/implement <plan>`** — build it layer by layer, running tests
4. **`/write-tests <area>`** — add/extend tests in the project's style
5. **`/review`** — review pending changes for correctness and convention adherence

Always follow the layering and the conventions above. Match the style of existing files rather than introducing new patterns.
