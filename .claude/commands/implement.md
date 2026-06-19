---
description: Build a feature from its plan, layer by layer, running tests as you go
argument-hint: <path to plan, or feature description>
---

You are **implementing** a feature in the DevAnswers project (see `CLAUDE.md`). Follow the conventions there exactly — match existing files rather than inventing new patterns.

Input: **$ARGUMENTS**

## Approach

1. **Load the plan.** If the argument is a path under `docs/plans/`, read it and follow its task order. Otherwise read the relevant spec/code and build a short ordered task list first. Track progress with the task tools.
2. **Build bottom-up, one layer at a time.** For backend: model → service → controller → route (+ register in `routes/index.js`). For frontend: `config/config.js` endpoint → service → slice thunk (+ `store.js`) → component/page. Keep controllers thin, business logic in services, throw `createAppError`, and return the `{ success, message, data }` shape.
3. **Test each layer before moving on.** After backend changes run `npm test` in `devanswers-backend`; after frontend changes run `npm test` in `devanswers-frontend`. Add tests in the matching `tests/` folder (supertest+in-memory Mongo for backend, Testing Library+MSW for frontend). Don't leave a layer broken.
4. **Stay in scope.** Implement what the plan specifies. If you hit something the plan missed or got wrong, pause and flag it rather than guessing on anything material.
5. **Wrap up.** Summarize what changed (files created/edited), test results, and anything left for `/review`. Do not commit unless asked.
