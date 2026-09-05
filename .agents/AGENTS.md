# Agent Rules for Stargazer

These rules apply to ALL AI agents working in this repository. There are no exceptions.

## ❌ What Agents Must NEVER Do
- Commit or push to git without explicitly asking the user and receiving approval first (even if the prompt says "commit and push")
- Push directly to `main` or any protected branch
- Merge Pull Requests automatically or without explicit human owner approval
- Add any bot suffixes or custom tags (such as "via AI Watchdog") to PR titles, commit messages, or merge messages
- Auto-merge using GitHub's auto-merge feature or any automation
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

## 🌐 Automatic Translation Requirement (Mandatory)
- **ALL UI changes, new components, badges, tooltips, or feature additions in StarGazer MUST include complete translations across all 3 supported locale dictionaries (`en.json`, `pt.json`, `es.json`) automatically, unless explicitly requested otherwise.**
- **All 3 translation files MUST pass `npm run check:i18n` with 100% key symmetry before any work is considered complete.**

## 🔒 Scope Constraint
Only touch files directly relevant to the task. Do not refactor unrelated code or alter PR title formats.

## 🛡️ Branch Protection Enforcement

The `main` branch is protected with the following rules:
- ✅ Require pull request reviews before merging (minimum 1 approval)
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Require code owners review (when applicable)
- ✅ Dismiss stale pull request reviews when new commits are pushed

**These protections FORCE all merges to be manual. No automation can bypass them.**

## ✅ What Agents CAN Do
- Create focused feature branches with clear naming
- Make targeted code changes that solve the specific problem
- Run local tests and verification
- Push to feature branches only (never `main`)
- Open PRs with clear, descriptive titles and descriptions
- Ask clarifying questions before proceeding
- Suggest improvements and best practices
- Provide detailed, conventional commit messages

## 📝 Commit Message Format (Conventional Commits)
All commits MUST follow this format:
```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: improve code structure
test: add or update tests
style: format code (no logic changes)
chore: update dependencies or tooling
```

**NEVER include:**
- "via AI Watchdog"
- "[bot]" or "[automated]"
- "automated by" or "by bot"
- Any tool or bot identifiers

## 🚫 If a Violation Occurs
If any agent violates these rules (auto-merges, adds bot tags, pushes to `main`, etc.):
1. The violation will be blocked by branch protection rules
2. The commit will be rejected by pre-commit hooks
3. Report to the repository owner immediately
4. Do not attempt to bypass protections

---

**Last Updated:** 2026-08-31  
**Owner:** nicolasnkGH  
**Status:** ✅ Enforced via Branch Protection + Pre-Commit Hooks
