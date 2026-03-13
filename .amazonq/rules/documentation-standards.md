# Documentation Standards Rule

## Rule: All Task Documentation Must Be in docs/ Folder

### Enforcement
- ALL task-related documentation files MUST be created in the `docs/` folder
- NO task documentation should be created in the root directory
- Follow naming convention: `TASK{N}_{DESCRIPTION}.md`

### Naming Pattern
```
docs/TASK{N}_{DESCRIPTION}.md
```

Where:
- `{N}` = Task number (1, 2, 3, etc.)
- `{DESCRIPTION}` = Brief description in SCREAMING_SNAKE_CASE

### Standard Documents per Task
Each task requires three standard documents:

1. **Technical Guide**: `docs/TASK{N}_{FEATURE}.md`
   - Complete implementation details
   - Architecture and design
   - Configuration options

2. **Summary**: `docs/TASK{N}_SUMMARY.md`
   - Executive summary
   - Files changed
   - Success criteria
   - Metrics

3. **Quick Start**: `docs/TASK{N}_QUICK_START.md`
   - Step-by-step setup
   - Verification steps
   - Common commands

### Examples

✅ **Correct**:
```
docs/TASK2_REDIS_INTEGRATION.md
docs/TASK2_SUMMARY.md
docs/TASK2_QUICK_START.md
docs/TASK3_SQS_INTEGRATION.md
```

❌ **Incorrect**:
```
REDIS_INTEGRATION.md              (wrong location, missing task number)
redis-integration.md              (wrong location, wrong naming)
docs/redis-integration.md         (wrong naming convention)
docs/Task2_Redis.md               (inconsistent case)
```

### Root Directory Exceptions
Only these files are allowed in root:
- `README.md` - Main project README
- `MVP_TASKS.md` - Task tracking
- `LICENSE` - Project license
- Configuration files (`.env`, `package.json`, etc.)

### Enforcement Actions
When creating documentation:
1. Always place in `docs/` folder
2. Use `TASK{N}_` prefix
3. Use SCREAMING_SNAKE_CASE for description
4. Create all three standard documents
5. Update `docs/README.md` with links

### Reference
See `docs/DOCUMENTATION_STANDARDS.md` for complete guidelines and templates.
