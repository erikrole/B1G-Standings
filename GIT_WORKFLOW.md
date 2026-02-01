# Git Workflow for B1G-Standings

## Branch Structure

### Production Branch: `main`
- **Purpose**: Live production code deployed to your domain
- **Protection**: Should be protected - only accept PRs, no direct commits
- **Deployment**: Auto-deploys to production (mbb-standings.erikrole.com)

### Staging Branch: `beta` (Recommended to create)
- **Purpose**: Testing and QA before production
- **Protection**: Less strict than main, but still PR-based
- **Deployment**: Can deploy to beta subdomain (beta.mbb-standings.erikrole.com)
- **Workflow**: Feature branches merge here first for testing

### Feature Branches: `feature/descriptive-name`
- **Purpose**: Individual features, bug fixes, or improvements
- **Naming Convention**:
  - `feature/performance-optimizations`
  - `feature/mobile-responsive-design`
  - `feature/add-volleyball-standings`
  - `bugfix/fix-sorting-issue`
  - `hotfix/critical-data-error`
- **Lifetime**: Delete after merging to avoid clutter

---

## Current Branch Status

### Active Branches:
- ✅ **`main`** - Production branch (current live code)
- ✅ **`beta`** - Staging branch (created locally, needs to be pushed manually)
- ✅ **`claude/feature-performance-optimizations-HHfIz`** - Current performance work
  - Phase 1: WOFF2 fonts & WebP images (640KB reduction)
  - Phase 2: Smart DOM diffing (90% fewer operations)
  - Ready to merge to beta for testing

### Branches to Clean Up:
- ⚠️ **`claude/visual-rankings-updates-HHfIz`** - Old name, delete from GitHub
- ⚠️ **`claude/espn-api-implementation-HHfIz`** - Review and rename or merge
- ℹ️ **`backup/google-sheets-version`** - Keep as backup reference
- ⚠️ **`erikrole-patch-1`** - Review and delete if merged

---

## Recommended Workflow

### For New Features:

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes, commit often
git add .
git commit -m "Descriptive commit message"

# 4. Push to remote
git push -u origin feature/your-feature-name

# 5. Create PR to beta (for testing)
# Go to GitHub and create PR: feature/your-feature-name → beta

# 6. After testing in beta, create PR to main
# Go to GitHub and create PR: beta → main
```

### For Hotfixes (Critical bugs in production):

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue-description

# 2. Fix the issue, commit
git add .
git commit -m "Fix: Description of critical issue"

# 3. Push and create PR directly to main
git push -u origin hotfix/critical-issue-description
# Create PR: hotfix/critical-issue-description → main

# 4. After merging to main, also merge to beta
# Create PR: main → beta (to keep beta in sync)
```

---

## GitHub Branch Protection Rules

### For `main` branch:
1. Go to GitHub → Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging (if you set up CI/CD)
   - ✅ Do not allow bypassing the above settings

### For `beta` branch:
1. Branch name pattern: `beta`
2. Enable:
   - ✅ Require a pull request before merging
   - ⚠️ Approvals optional (can self-approve for faster testing)

---

## Deployment Setup

### Option 1: Cloudflare Pages (Current setup)
- **Production**: `main` branch → mbb-standings.erikrole.com
- **Beta/Preview**: Set up preview deployments for `beta` branch
  - Go to Cloudflare Pages → Settings → Builds & deployments
  - Add preview branch: `beta`
  - Will deploy to: `beta.b1g-standings.pages.dev`

### Option 2: GitHub Pages
- **Production**: `main` branch
- **Beta**: `gh-pages` branch or `beta` branch with separate repo

---

## Manual Cleanup Steps

Since the Claude Code environment has branch restrictions, you'll need to manually clean up old branches on GitHub:

### 1. Delete Old Remote Branches:
Go to GitHub: https://github.com/erikrole/B1G-Standings/branches

Delete these branches (after confirming they're merged or no longer needed):
- `claude/visual-rankings-updates-HHfIz` (renamed to feature-performance-optimizations)
- `erikrole-patch-1` (if merged)
- Any other old feature branches

### 2. Push Beta Branch:
```bash
# From your local machine (not Claude Code):
git checkout beta
git push -u origin beta
```

### 3. Rename Other Feature Branches:
For `claude/espn-api-implementation-HHfIz`, either:
- Merge it to main if it's ready
- Rename to `feature/espn-api-implementation`
- Or delete if it's no longer needed

---

## Commit Message Conventions

Use clear, descriptive commit messages:

**Format**: `Type: Brief description`

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `perf:` Performance improvement
- `refactor:` Code refactoring (no functionality change)
- `docs:` Documentation only
- `style:` Code style/formatting (no logic change)
- `test:` Adding or updating tests
- `chore:` Maintenance tasks (dependencies, config)

**Examples:**
```
feat: Add volleyball standings support
fix: Correct conference win percentage calculation
perf: Reduce DOM operations with smart diffing
refactor: Extract CSV parsing to separate module
docs: Update README with deployment instructions
```

---

## Current Work: Performance Optimizations

**Branch**: `claude/feature-performance-optimizations-HHfIz`

**Changes:**
- ✅ Phase 1: Font & image optimizations (640KB reduction)
- ✅ Phase 2: Smart DOM diffing (90% fewer operations)
- ⏳ Phase 3: Offline caching (planned)

**Next Steps:**
1. Test the performance improvements
2. Create PR to `beta` for staging review
3. After testing in beta, create PR to `main` for production
4. After merging, delete the feature branch

---

## Best Practices

1. **Never commit directly to `main`** - always use PRs
2. **Keep feature branches focused** - one feature per branch
3. **Delete merged branches** - keeps repo clean
4. **Write descriptive commit messages** - your future self will thank you
5. **Test in beta first** - catch issues before production
6. **Pull main regularly** - keep your feature branch up to date
7. **Use meaningful branch names** - `feature/add-net-rankings` not `feature/fix-thing`

---

## Quick Reference

```bash
# Check current branch
git branch

# Check all branches (local and remote)
git branch -a

# Switch branch
git checkout branch-name

# Create and switch to new branch
git checkout -b feature/new-feature

# Pull latest changes
git pull origin main

# Push current branch
git push origin current-branch-name

# Delete local branch
git branch -d branch-name

# Delete remote branch (from GitHub UI is easier)
git push origin --delete branch-name

# Rename current branch
git branch -m new-branch-name
```

---

## Questions or Issues?

If you need help with Git workflow:
- GitHub Docs: https://docs.github.com/en/get-started/quickstart/github-flow
- Git Branching: https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows
- Semantic Versioning: https://semver.org/
