---
description: Review pending changes for correctness and convention adherence
argument-hint: [optional area or file to focus on]
allowed-tools: Read, Grep, Glob, Bash
---

Review the current changes in the DevAnswers project (see `CLAUDE.md`).

Focus: **$ARGUMENTS** (if empty, review all uncommitted/working changes).

## Steps

1. **Find what changed.** Use `git diff` / `git status` if this is a git repo; otherwise inspect the files named in the focus argument or recently edited.
2. **Check correctness:** logic bugs, unhandled errors, wrong status codes, missing `await`, broken async flows, security issues (auth bypass, leaking secrets, missing input validation, exposing the JWT secret).
3. **Check conventions** against `CLAUDE.md`:
   - Backend: layering respected (no DB/business logic in controllers), services throw `createAppError`, responses use `{ success, message, data }`, routes register correctly and apply `authenticate` where needed.
   - Frontend: endpoints live in `config/config.js`, services unwrap `res.data.data`, thunks use `rejectWithValue` with the standard fallback message, slices registered in `store.js`.
   - Tests added/updated in the matching folder.
4. **Report findings** grouped by severity: **Blocking** (must fix), **Should fix**, **Nit**. For each: file:line, what's wrong, and the concrete fix. If everything is clean, say so plainly. Do not change code unless asked — this is a review.
