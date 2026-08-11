# Agent Rules for Stargazer

These rules apply to ALL AI agents working in this repository. There are no exceptions.

## ❌ What Agents Must NEVER Do
- Push directly to `main` or any protected branch
- Open Pull Requests (the owner handles all PRs)
- Merge Pull Requests
- Delete branches
- Create GitHub releases or tags
- Modify CI/CD pipeline files (`.github/workflows/`)
- Modify deployment configs (`docker-compose.yml`, `Dockerfile`, GCP configs)
- Add, remove, or modify repository secrets or environment variables
- Install new dependencies without explicit instruction (`requirements.txt`, `package.json`)
- Call any Kanban tools (`kanban_complete`, `kanban_block`, etc.) unless explicitly told to

## ✅ What Agents Are Allowed to Do
- Read and modify source code files within `api/`, `web/`, `tests/`, `nextjs-app/`
- Write and run local tests
- Create a feature branch and commit code changes to it
- Push the feature branch to origin

## Workflow
1. Create a branch: `git checkout -b fix/<short-description>`
2. Make only the code changes requested — nothing more
3. Commit and push the branch: `git push origin <branch-name>`
4. **Stop. Do not open a PR, do not merge, do not do anything else.**
   The owner will take it from here.

## Scope Constraint
Only touch files directly relevant to the task. Do not refactor unrelated code,
update documentation unprompted, or make "while I'm here" changes.
