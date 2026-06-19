# DevAnswers

A full-stack **StackOverflow-style Q&A platform**. Users register, ask questions (with tags), post answers, vote, bookmark questions for later, and edit their own posts — with AI assists for improving question drafts and summarizing answers.

This is a monorepo with two independently-run apps:

- **`devanswers-backend/`** — REST API: Express 5, MongoDB/Mongoose, JWT auth, Google Gemini AI.
- **`devanswers-frontend/`** — SPA: React 19, Redux Toolkit, React Router 7, Vite, React-Bootstrap.

---

## Features

**Accounts & auth**
- Register and log in; JSON Web Token (JWT) sessions.
- Authentication-gated actions (asking, answering, voting, bookmarking, editing).

**Questions**
- Browse the question feed with **search**, **sort** (newest / most votes / most answers), and **pagination**.
- View a question with its answers and a **view counter**.
- Ask a question with a title, description, and comma-separated **tags** (tags are created or reused automatically).
- **Edit your own questions** (title, description, tags) inline on the question page; edited posts show an **"edited"** indicator.
- **Upvote / downvote** questions.
- **Bookmark** questions to save them for later.

**Answers**
- Post answers to a question.
- **Edit your own answers** in place on the question page, with an **"edited"** indicator.
- **Upvote / downvote** answers.

**Tags**
- Browse all tags with per-tag question counts.
- Filter the feed by a selected tag.

**Bookmarks**
- Save and unsave questions; the bookmark icon reflects the current state instantly.
- A **"Saved Questions"** section on your profile lists everything you've saved (with a friendly empty state), where you can open or unsave them.
- Saved sets are per-user and persist across sessions.

**AI assists (Google Gemini)**
- **Improve with AI** — refine a question draft's title, description, and tags before posting.
- **Summarize Answers** — generate a concise summary once a question has 3+ answers.

**Profile**
- Personal profile page with activity stats and the saved-questions list.

**Experience**
- Light/dark **theme** toggle (persisted).
- Responsive, sidebar-based layout built with React-Bootstrap and react-icons.
- Reusable voting and bookmark controls with built-in auth guards.

**Security**
- Helmet headers, CORS, and request rate limiting on the API.
- Passwords hashed with bcrypt; protected routes verified via JWT middleware.

---

## Tech stack

| | Backend | Frontend |
|---|---|---|
| Runtime / Framework | Node.js, Express 5 | React 19, Vite 6 |
| Data / State | MongoDB, Mongoose 8 | Redux Toolkit, React-Redux |
| Auth | JWT (`jsonwebtoken`), bcryptjs | token in `localStorage` |
| AI | `@google/genai` (Gemini 2.5 Flash) | — |
| HTTP | — | axios |
| Hardening / UI | helmet, CORS, express-rate-limit | React-Bootstrap, react-icons |
| Testing | Vitest, supertest, mongodb-memory-server | Vitest, Testing Library, MSW |

---

## Project structure

```
.
├── devanswers-backend/        # Express API (routes → controllers → services → models)
│   └── src/{routes,controllers,services,models,middleware,utils}
├── devanswers-frontend/       # React SPA (config → service → slice → component)
│   └── src/{config,api,services,reducers,components,pages,layouts}
├── specs/                     # spec + implementation plan per feature
├── .claude/                   # reusable Claude Code toolkit (slash commands)
├── CLAUDE.md                  # project memory: architecture & conventions
└── README.md
```

---

## Getting started

### Prerequisites
- Node.js 18+ and npm
- A MongoDB instance (local `mongod` or a connection string)
- A Google Gemini API key (only needed for the AI features)

### 1. Backend

```bash
cd devanswers-backend
npm install
cp .env.example .env        # then fill in the values
npm run dev                 # starts the API on http://localhost:3000
```

`.env` variables:

| Var | Description |
|---|---|
| `PORT` | API port (default `3000`) |
| `NODE_ENV` | `development` / `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | secret used to sign JWTs |
| `JWT_EXPIRATION` | token lifetime, e.g. `7d` |
| `GEMINI_API_KEY` | Google Gemini key (AI features) |

Optional: `npm run populate` seeds the database with sample data.

### 2. Frontend

```bash
cd devanswers-frontend
npm install
npm run dev                 # starts Vite on http://localhost:5173
```

The frontend expects the API at `http://localhost:3000/api` (see `src/api/axiosInstance.js`).

---

## Testing

Both apps use **Vitest**.

```bash
# Backend — unit + integration (in-memory MongoDB)
cd devanswers-backend && npm test

# Frontend — unit + integration (Testing Library + MSW)
cd devanswers-frontend && npm test
```

---

## API overview

All routes are under `/api`. Responses use a consistent envelope: `{ success, message, data }`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register`, `/auth/login` | – | Register / log in |
| GET | `/questions` | – | List questions |
| GET | `/questions/:id` | – | Question + answers (increments views) |
| POST | `/questions` | ✓ | Create question |
| PUT | `/questions/:id` | ✓ (author) | Edit question |
| POST | `/questions/:id/upvote` · `/downvote` | ✓ | Vote on a question |
| POST | `/questions/improve` | ✓ | AI improve a draft |
| POST | `/questions/:id/bookmark` | ✓ | Save a bookmark |
| DELETE | `/questions/:id/bookmark` | ✓ | Remove a bookmark |
| GET | `/questions/saved` | ✓ | List the current user's bookmarks |
| POST | `/questions/:questionId/answers` | ✓ | Post an answer |
| PUT | `/answers/:answerId` | ✓ (author) | Edit an answer |
| POST | `/answers/:answerId/upvote` · `/downvote` | ✓ | Vote on an answer |
| POST | `/answers/summarize` | ✓ | AI summarize (3+ answers) |
| GET | `/tags` · `/tags/:tagId/questions` | – | Tags / questions by tag |

---

## Architecture & conventions

The codebase follows strict, consistent patterns (captured in [`CLAUDE.md`](CLAUDE.md)):

- **Backend:** layered `routes → controllers → services → models`. Controllers stay thin and return the `{ success, message, data }` envelope; services hold all business logic and database access and raise errors via a shared `createAppError` helper; a central error handler formats responses. Protected routes use JWT middleware that sets `req.user`.
- **Frontend:** unidirectional `config endpoint → service → Redux slice → component`. Endpoint paths live in one config module; services unwrap `res.data.data`; async thunks use `rejectWithValue`; UI reads from typed slices.

Feature work in this repo is **spec-driven**: each feature has a spec and an implementation plan under [`specs/`](specs), and the reusable Claude Code slash commands that drive that pipeline live in [`.claude/commands/`](.claude/commands).
