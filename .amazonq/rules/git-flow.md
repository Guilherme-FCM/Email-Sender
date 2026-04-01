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
Write the PR body to a temp file first, then create the PR using `--body-file`. This ensures newlines render correctly on all platforms:
```bash
echo ## Summary > pr_body.txt
echo {what was implemented} >> pr_body.txt
echo. >> pr_body.txt
echo ## Changes >> pr_body.txt
echo {list of files changed} >> pr_body.txt

gh pr create \
  --title "TASK{N}: {Short Description}" \
  --body-file pr_body.txt \
  --base main

del pr_body.txt
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
