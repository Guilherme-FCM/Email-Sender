# Documentation Standards and Patterns

## Overview
This document defines the documentation structure and naming conventions for the Email-Sender project. All task-related documentation must follow these patterns.

## Directory Structure

```
Email-Sender/
├── docs/                           # All task documentation goes here
│   ├── TASK1_AUTOMATIC_IDEMPOTENCY.md
│   ├── TASK1_COMPLETION.md
│   ├── TASK2_REDIS_INTEGRATION.md
│   ├── TASK2_SUMMARY.md
│   ├── TASK2_QUICK_START.md
│   ├── TASK3_*.md                  # Future task docs
│   └── ...
├── README.md                       # Main project README (root only)
├── MVP_TASKS.md                    # Task tracking (root only)
└── ...
```

## Naming Conventions

### Task Documentation Files
All task-related documentation files MUST be placed in the `docs/` folder with the following naming pattern:

```
TASK{N}_{DESCRIPTION}.md
```

Where:
- `{N}` = Task number (1, 2, 3, etc.)
- `{DESCRIPTION}` = Brief description in SCREAMING_SNAKE_CASE

### Standard Document Types per Task

Each task should have these three standard documents:

1. **Technical Implementation Guide**
   - Name: `TASK{N}_{FEATURE_NAME}.md`
   - Example: `TASK2_REDIS_INTEGRATION.md`
   - Content: Complete technical documentation, architecture, implementation details

2. **Summary Document**
   - Name: `TASK{N}_SUMMARY.md`
   - Example: `TASK2_SUMMARY.md`
   - Content: Executive summary, files changed, success criteria, next steps

3. **Quick Start Guide**
   - Name: `TASK{N}_QUICK_START.md`
   - Example: `TASK2_QUICK_START.md`
   - Content: Step-by-step guide for developers to get started quickly

### Additional Documentation (Optional)

For troubleshooting or specific issues:
- Name: `TASK{N}_{ISSUE_NAME}.md`
- Example: `TASK2_FIX_IOREDIS_ERROR.md`
- Place in `docs/` folder

## Document Templates

### 1. Technical Implementation Guide Template

```markdown
# {Feature Name} - Task {N} Implementation

## Overview
Brief description of what was implemented and why.

## What Was Implemented

### 1. Component Name
- Feature 1
- Feature 2
- Feature 3

### 2. Another Component
- Feature 1
- Feature 2

## How It Works

### Flow Description
Step-by-step explanation of the feature flow.

## Installation

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment
\`\`\`env
VARIABLE=value
\`\`\`

### 3. Start Services
\`\`\`bash
docker-compose up
\`\`\`

## Testing

### Run Tests
\`\`\`bash
npm test
\`\`\`

## Architecture

\`\`\`
[ASCII diagram or description]
\`\`\`

## Success Criteria ✅

- ✅ Criterion 1
- ✅ Criterion 2

## Next Steps

### Task {N+1}: Next Feature
- Item 1
- Item 2

## Troubleshooting

### Issue 1
\`\`\`bash
# Solution
\`\`\`

## References
- [Link 1](url)
- [Link 2](url)
```

### 2. Summary Document Template

```markdown
# Task {N} Implementation Summary

## ✅ {Feature Name} - COMPLETED

### Files Created
1. **path/to/file.ts** - Description
2. **path/to/file.ts** - Description

### Files Modified
1. **path/to/file.ts** - Description
2. **path/to/file.ts** - Description

### Key Features Implemented

#### 1. Feature Name
- Detail 1
- Detail 2

#### 2. Another Feature
- Detail 1
- Detail 2

### Configuration

#### Environment Variables
\`\`\`env
VARIABLE=value
\`\`\`

### Testing

#### Test Coverage
- Test type 1
- Test type 2

#### Running Tests
\`\`\`bash
npm test
\`\`\`

### Performance Improvements

#### Metric 1
- **Before**: Value
- **After**: Value

### Next Steps

#### Immediate
1. Step 1
2. Step 2

#### Task {N+1}: Next Feature
- Item 1
- Item 2

### Success Metrics ✅

- ✅ Metric 1
- ✅ Metric 2

### Commands Reference

\`\`\`bash
# Command 1
command

# Command 2
command
\`\`\`

## Conclusion

Summary paragraph.

**Status**: ✅ COMPLETE
**Next Task**: Task {N+1} - Feature Name
```

### 3. Quick Start Guide Template

```markdown
# Quick Start Guide - {Feature Name}

## 🚀 Get Started in 3 Steps

### Step 1: Action
\`\`\`bash
command
\`\`\`

### Step 2: Action
\`\`\`bash
command
\`\`\`

### Step 3: Action
\`\`\`bash
command
\`\`\`

## ✅ Verify Installation

### Check Something
\`\`\`bash
command
# Expected: output
\`\`\`

## 🔍 Monitor/Debug

### Access Tool
\`\`\`bash
command
\`\`\`

### Useful Commands
\`\`\`bash
# Command 1
command

# Command 2
command
\`\`\`

## 🧪 Run Tests

\`\`\`bash
npm test
\`\`\`

## 📊 What Changed?

### Before
\`\`\`typescript
// old code
\`\`\`

### After
\`\`\`typescript
// new code
\`\`\`

## 🎯 Key Benefits

1. Benefit 1
2. Benefit 2

## 📁 New Files

- `path/file.ts` - Description
- `path/file.ts` - Description

## 🔧 Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| VAR1 | value | Description |
| VAR2 | value | Description |

## 🐛 Troubleshooting

### Issue 1
\`\`\`bash
# Solution
\`\`\`

## 📚 Documentation

- **TASK{N}_FEATURE.md** - Full guide
- **TASK{N}_SUMMARY.md** - Summary

## ⏭️ Next Steps

Ready for **Task {N+1}: Feature Name**
- Item 1
- Item 2

---

**Questions?** Check `TASK{N}_FEATURE.md` for detailed documentation.
```

## File Organization Rules

### ✅ DO

1. **Place all task documentation in `docs/` folder**
   ```
   docs/TASK2_REDIS_INTEGRATION.md  ✅
   ```

2. **Use consistent naming with task number prefix**
   ```
   TASK2_REDIS_INTEGRATION.md  ✅
   TASK2_SUMMARY.md            ✅
   TASK2_QUICK_START.md        ✅
   ```

3. **Create all three standard documents per task**
   - Technical guide
   - Summary
   - Quick start

4. **Update MVP_TASKS.md when task is complete**
   ```markdown
   - [x] Task item
   ```

### ❌ DON'T

1. **Don't place task docs in root directory**
   ```
   REDIS_INTEGRATION.md  ❌ (should be docs/TASK2_REDIS_INTEGRATION.md)
   ```

2. **Don't use inconsistent naming**
   ```
   redis-integration.md     ❌
   Redis_Integration.md     ❌
   task-2-redis.md         ❌
   ```

3. **Don't create documentation without task number**
   ```
   REDIS_INTEGRATION.md  ❌ (missing TASK2_ prefix)
   ```

4. **Don't mix documentation types**
   ```
   TASK2_EVERYTHING.md  ❌ (split into separate docs)
   ```

## Root Directory Files

Only these documentation files should exist in the root directory:

1. **README.md** - Main project README
2. **MVP_TASKS.md** - Task tracking and planning
3. **LICENSE** - Project license

All other documentation goes in `docs/`.

## Documentation Workflow

### When Starting a New Task

1. Create planning document in `docs/`:
   ```
   docs/TASK{N}_PLANNING.md
   ```

2. Document implementation details during development

3. Upon completion, create the three standard documents:
   ```
   docs/TASK{N}_{FEATURE}.md
   docs/TASK{N}_SUMMARY.md
   docs/TASK{N}_QUICK_START.md
   ```

4. Update `MVP_TASKS.md` to mark task as complete

5. Move any temporary/troubleshooting docs to `docs/` with proper naming

### Example: Task 2 Documentation

```
docs/
├── TASK2_REDIS_INTEGRATION.md    # Technical implementation guide
├── TASK2_SUMMARY.md               # Executive summary
├── TASK2_QUICK_START.md           # Quick start for developers
└── TASK2_FIX_IOREDIS_ERROR.md    # Troubleshooting guide (optional)
```

## Markdown Style Guide

### Headers
- Use `#` for main title
- Use `##` for major sections
- Use `###` for subsections
- Use `####` for sub-subsections

### Code Blocks
Always specify language:
```markdown
\`\`\`typescript
// TypeScript code
\`\`\`

\`\`\`bash
# Bash commands
\`\`\`

\`\`\`json
{
  "key": "value"
}
\`\`\`
```

### Lists
- Use `-` for unordered lists
- Use `1.` for ordered lists
- Use `- [ ]` for unchecked tasks
- Use `- [x]` for completed tasks

### Emphasis
- Use `**bold**` for important terms
- Use `*italic*` for emphasis
- Use `` `code` `` for inline code
- Use `> quote` for important notes

### Links
```markdown
[Link Text](url)
[File Reference](../path/to/file.ts)
```

## Maintenance

### Regular Reviews
- Review documentation quarterly
- Update outdated information
- Archive obsolete documents
- Consolidate related documents

### Version Control
- Commit documentation with related code changes
- Use descriptive commit messages
- Tag major documentation updates

## Enforcement

All pull requests must include:
1. Updated or new documentation in `docs/` folder
2. Proper naming conventions followed
3. All three standard documents for new tasks
4. Updated `MVP_TASKS.md` if applicable

## Examples

### Good Documentation Structure ✅
```
docs/
├── TASK1_AUTOMATIC_IDEMPOTENCY.md
├── TASK1_COMPLETION.md
├── TASK2_REDIS_INTEGRATION.md
├── TASK2_SUMMARY.md
├── TASK2_QUICK_START.md
├── TASK3_SQS_INTEGRATION.md
├── TASK3_SUMMARY.md
└── TASK3_QUICK_START.md
```

### Bad Documentation Structure ❌
```
redis-docs.md                    ❌ (wrong location, wrong name)
REDIS_INTEGRATION.md             ❌ (wrong location, missing task number)
docs/redis-integration.md        ❌ (wrong naming convention)
docs/Task2_Redis.md              ❌ (inconsistent case)
```

## Questions?

If you're unsure about documentation placement or naming:
1. Check this guide
2. Look at existing task documentation in `docs/`
3. Follow the templates provided above

---

**Last Updated**: Task 2 Completion
**Maintained By**: Development Team
