# Agent Rules for Stargazer

These rules apply to ALL AI agents working in this repository. There are no exceptions.

## ❌ What Agents Must NEVER Do
- Commit or push to git without explicitly asking the user and receiving approval first (even if the prompt says "commit and push")
- Push directly to `main` or any protected branch
- Merge Pull Requests automatically or without explicit human owner approval
- Add any bot suffixes or custom tags (such as "via AI Watchdog") to PR titles, commit messages, or merge messages
- Delete branches without permission
- Create GitHub releases or tags without explicit instruction

## 📋 Standard PR & Manual Approval Workflow
1. Create a feature branch: `git checkout -b feat/<short-description>` or `fix/<short-description>`
2. Make only the requested code changes — clean, focused, and tested locally.
3. Present verification results and a summary to the user. **Always ask for explicit confirmation before committing or pushing.**
4. Once user approves, commit with standard conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`). **DO NOT include any "via AI Watchdog" or bot strings.**
5. Push the branch to origin: `git push origin <branch-name>`
6. Open a standard Pull Request using `gh pr create` with clean title and description.
7. **STOP and wait for the owner to manually review, approve, and merge the PR.**

## 🔒 Scope Constraint
Only touch files directly relevant to the task. Do not refactor unrelated code or alter PR title formats.
