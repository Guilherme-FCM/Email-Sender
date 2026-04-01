# Git Flow Rule

## Rule: Every New Task Must Follow This Git Workflow

When asked to implement a new task, ALWAYS execute the full git workflow below using `executeBash` tool. Never skip steps.

### Required Tools
- `git` — version control
- `gh` — GitHub CLI for pull request creation

---

## Workflow Steps

### 1. Create and checkout task branch
```bash
git checkout -b task/TASK{N}_{DESCRIPTION}
```
Branch naming must match the documentation standard: `TASK{N}_{DESCRIPTION}` in SCREAMING_SNAKE_CASE.

### 2. Implement the task
Make all code changes, create documentation files under `docs/` following `documentation-standards.md`.

### 3. Stage all changes
```bash
git add .
```

### 4. Commit with conventional commit message
```bash
git commit -m "feat: TASK{N} - {short description}"
```

### 5. Push branch to remote
```bash
git push -u origin task/TASK{N}_{DESCRIPTION}
```

### 6. Create Pull Request
```bash
gh pr create \
  --title "TASK{N}: {Short Description}" \
  --body "## Summary\n{what was implemented}\n\n## Changes\n{list of files changed}" \
  --base main
```

---

## Branch Naming Convention

| Pattern | Example |
|---|---|
| `task/TASK{N}_{DESCRIPTION}` | `task/TASK3_SQS_INTEGRATION` |

---

## Commit Message Convention

| Type | When to use |
|---|---|
| `feat:` | New feature or task implementation |
| `fix:` | Bug fix |
| `docs:` | Documentation only changes |
| `refactor:` | Code restructuring without behavior change |

---

## Rules
- NEVER ask the user to run git commands manually
- ALWAYS create the branch BEFORE making any code changes
- ALWAYS include documentation files in the same commit as the code
- ALWAYS create the PR at the end, targeting `main` branch
