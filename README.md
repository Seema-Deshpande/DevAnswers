# DevAnswers

A full-stack **StackOverflow-style Q&A platform**. Users register, ask questions (with tags), post answers, and vote — with AI assists for improving question drafts and summarizing answers. This repository is a monorepo with two independently-run apps:

- **`devanswers-backend/`** — REST API: Express 5, MongoDB/Mongoose, JWT auth, Google Gemini AI.
- **`devanswers-frontend/`** — SPA: React 19, Redux Toolkit, React Router 7, Vite, React-Bootstrap.

> Built for the Week-11 graded project. Two features were added on top of the starter code — **Bookmark Questions** and **Edit your own Questions & Answers** — using a spec-driven, AI-assisted workflow (see [Development workflow](#development-workflow)).

---

## Features

- **Authentication** — register, log in, JWT-protected actions.
- **Questions** — list/feed, detail view (with view counts), create, tag, vote.
- **Answers** — post answers, vote.
- **Tags** — browse tags, filter questions by tag.
- **AI** — "Improve with AI" on question drafts; "Summarize Answers" (Google Gemini).
- **🔖 Bookmark Questions** *(added)* — save/unsave questions, per-user, with a "Saved Questions" section on your profile.
- **✏️ Edit own Questions & Answers** *(added)* — authors edit their own posts on the question page, with an "edited" indicator.
- **Theme** — light/dark mode toggle.

See [Implemented features](#implemented-features-this-project) for details.

---

## Tech stack

| | Backend | Frontend |
|---|---|---|
| Runtime/Framework | Node.js, Express 5 | React 19, Vite 6 |
| Data/State | MongoDB, Mongoose 8 | Redux Toolkit, React-Redux |
| Auth | JWT (`jsonwebtoken`), bcryptjs | token in `localStorage` |
| AI | `@google/genai` (Gemini 2.5 Flash) | — |
| HTTP | — | axios |
| UI | helmet, CORS, rate-limit | React-Bootstrap, react-icons |
| Testing | Vitest, supertest, mongodb-memory-server | Vitest, Testing Library, MSW |

---

## Project structure

```
.
├── devanswers-backend/        # Express API (routes → controllers → services → models)
│   └── src/{routes,controllers,services,models,middleware,utils}
├── devanswers-frontend/       # React SPA (config → service → slice → component)
│   └── src/{config,api,services,reducers,components,pages,layouts}
├── specs/                     # spec + plan per feature (spec-driven workflow)
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
# Backend — unit + integration (in-memory MongoDB, runs serially)
cd devanswers-backend && npm test

# Frontend — unit + integration (Testing Library + MSW)
cd devanswers-frontend && npm test
```

Current status: **backend 245 passing**, **frontend 178 passing** (2 intentional, pre-existing skips for localStorage-init tests).

---

## API overview

All routes are under `/api`. Responses use a consistent envelope: `{ success, message, data }`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register`, `/auth/login` | – | Register / log in |
| GET | `/questions` | – | List questions |
| GET | `/questions/:id` | – | Question + answers (increments views) |
| POST | `/questions` | ✓ | Create question |
| PUT | `/questions/:id` | ✓ (author) | **Edit question** |
| POST | `/questions/:id/upvote` · `/downvote` | ✓ | Vote |
| POST | `/questions/improve` | ✓ | AI improve draft |
| POST | `/questions/:id/bookmark` | ✓ | **Save bookmark** |
| DELETE | `/questions/:id/bookmark` | ✓ | **Remove bookmark** |
| GET | `/questions/saved` | ✓ | **List my bookmarks** |
| POST | `/questions/:questionId/answers` | ✓ | Post answer |
| PUT | `/answers/:answerId` | ✓ (author) | **Edit answer** |
| POST | `/answers/:answerId/upvote` · `/downvote` | ✓ | Vote |
| POST | `/answers/summarize` | ✓ | AI summarize (≥3 answers) |
| GET | `/tags` · `/tags/:tagId/questions` | – | Tags / questions by tag |

---

## Implemented features (this project)

### 🔖 Bookmark Questions
Logged-in users save questions and revisit them from their profile.
- **Backend:** `User.bookmarks: [Question]`; idempotent `POST`/`DELETE /questions/:id/bookmark` and `GET /questions/saved`. Per-user (keyed on `req.user.id`); `GET /saved` is registered before `GET /:id` so it isn't parsed as an id.
- **Frontend:** a shared `BookmarkButton` (filled vs. outline icon, auth-guarded) on the feed and the question page; a `bookmark` Redux slice where `savedIds` drives icon state; a profile **"Saved Questions"** section (reuses the question-list UI) with a friendly empty state; the saved set is hydrated on app load/login.

### ✏️ Edit own Questions & Answers
Authors edit their own content on the question detail page (deletion is out of scope).
- **Backend:** an `isEdited` flag on Question/Answer set **only** on a content edit (not on votes, which also touch `updatedAt`); empty-content validation (`400`); owner-only enforcement (`403`).
- **Frontend:** pencil affordances shown **only to the author, only on the question page**; pre-filled inline edit forms with cancel; updates render in place (no reload); an **"(edited)"** indicator.

Out of scope (per the brief): deleting posts, bookmarking answers, and folders/notes/sharing/export of saved questions.

---

## Development workflow

This project was built with **Claude Code** using a reusable, spec-driven pipeline:

1. **`/spec`** → a precise, testable spec per feature → `specs/<feature>/spec.md`
2. **`/plan-feature`** → an ordered, bottom-up implementation plan → `specs/<feature>/plan.md`
3. **`/implement`** → build to the plan, tests-first
4. **`/review`** → review the diff
5. Test & verify

The slash commands live in [`.claude/commands/`](.claude/commands), and [`CLAUDE.md`](CLAUDE.md) is the project memory capturing the architecture and conventions every change follows:

- **Backend:** `routes → controllers → services → models`; `{ success, message, data }` envelope; errors via `createAppError`.
- **Frontend:** `config endpoint → service → Redux slice → component`; services unwrap `res.data.data`; thunks use `rejectWithValue`.
