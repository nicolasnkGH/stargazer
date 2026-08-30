# Agent Rules for Stargazer

These rules apply to ALL AI agents working in this repository. There are no exceptions.

## ❌ What Agents Must NEVER Do
- Push directly to `main` or any protected branch
- Merge Pull Requests automatically or without explicit human owner approval
- Add any bot suffixes or custom tags (such as "via AI Watchdog") to PR titles, commit messages, or merge messages
- Delete branches without permission
- Create GitHub releases or tags without explicit instruction

## 📋 Standard PR & Manual Approval Workflow
1. Create a feature branch: `git checkout -b feat/<short-description>` or `fix/<short-description>`
2. Make only the requested code changes — clean, focused, and tested locally.
3. Commit with standard conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`). **DO NOT include any "via AI Watchdog" or bot strings.**
4. Push the branch to origin: `git push origin <branch-name>`
5. Open a standard Pull Request using `gh pr create` with clean title and description.
6. **STOP and wait for the owner to manually review, approve, and merge the PR.**

## 🔒 Scope Constraint
Only touch files directly relevant to the task. Do not refactor unrelated code or alter PR title formats.
