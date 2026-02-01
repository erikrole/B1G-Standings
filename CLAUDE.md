# CLAUDE.md - Project-Specific Guidelines

This file contains rules and learnings to help Claude Code work effectively on this project.

## Git Workflow Rules

### Branch Naming Conventions
- **CRITICAL**: All branches pushed by Claude Code MUST follow the pattern: `claude/<descriptive-name>-<SESSION_ID>`
  - The session ID must match the current session
  - Branches without this pattern will fail with HTTP 403 error
  - Example: `claude/visual-rankings-updates-HHfIz`

### Protected Branches
- **main**: Production branch - NEVER push directly, only via Pull Requests
- **beta**: Staging branch - Cannot be pushed by Claude due to naming restrictions
  - Beta must be managed manually by the repository owner

### Pull Request Workflow
1. **Feature Development**:
   - Create branch from main: `git checkout -b claude/feature-name-<SESSION_ID>`
   - Develop and commit with clear, descriptive messages
   - Push to origin: `git push -u origin claude/feature-name-<SESSION_ID>`
   - Create PR to `main` (since beta cannot be pushed by Claude)

2. **Commit Message Format**:
   - Use conventional commit format: `type: description`
   - Types: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `style:`, `test:`, `chore:`
   - Example: `feat: Add volleyball standings support`

3. **Before Creating PR**:
   - Sync with main: `git pull origin main --no-rebase`
   - Check diff: `git diff origin/main..HEAD --stat`
   - Verify all changes are intentional

### Common Mistakes to Avoid

1. **Duplicate Commits**:
   - LESSON: Before cherry-picking or merging, check if the change already exists on main
   - Always run `git log origin/main --oneline -10` to see recent main commits
   - If the change exists, don't duplicate it

2. **Branch Naming**:
   - LESSON: Never try to push branches without the `claude/<name>-<SESSION_ID>` pattern
   - This includes `beta`, `main`, or feature branches without session IDs
   - Will result in HTTP 403 errors

3. **Assuming Branch State**:
   - LESSON: Always check current branch status before making changes
   - Use `git status` and `git log --graph --all --oneline` to understand state
   - Feature branches may already be merged to main via PRs

4. **Beta Branch Limitations**:
   - LESSON: Beta branch exists locally but cannot be pushed by Claude
   - Don't attempt to push beta - it will fail
   - Create PRs directly to main instead

## Project-Specific Context

### Repository Structure
- **Frontend**: HTML/CSS/JavaScript (Vanilla JS, no framework)
- **Data Source**: Warren Nolan CSV data via Cloudflare Worker proxy
- **Deployment**: Cloudflare Pages (main branch auto-deploys)

### Performance Optimizations Completed
- Phase 1: WOFF2 fonts & WebP images (640KB reduction)
- Phase 2: Smart DOM diffing (90% fewer DOM operations)
- See commits 3171ca2 and 2f95c2e for details

### Active Features
- Big Ten Men's Basketball Standings
- Real-time data updates from Warren Nolan
- Responsive design for mobile/desktop
- Visual ranking indicators

## Best Practices from INSTRUCTIONS.md

1. **Use Subagents**: For complex multi-step tasks, use subagents to keep main context clean
2. **Plan Mode**: Start complex tasks in plan mode for better implementation
3. **Parallel Work**: When possible, work on multiple independent tasks in parallel
4. **Prove It Works**: Before creating PRs, verify changes work correctly
5. **Challenge Assumptions**: Review changes critically before committing

## Development Workflow Checklist

Before making changes:
- [ ] Check current branch: `git branch`
- [ ] Verify on correct branch or create new one
- [ ] Pull latest from main: `git fetch origin main`
- [ ] Check for conflicts or duplicate work

During development:
- [ ] Make focused, incremental commits
- [ ] Use clear, descriptive commit messages
- [ ] Test changes locally when possible
- [ ] Keep commits atomic and logical

Before creating PR:
- [ ] Sync with main: `git pull origin main --no-rebase`
- [ ] Review diff: `git diff origin/main..HEAD`
- [ ] Ensure no duplicate or unnecessary changes
- [ ] Push branch: `git push -u origin claude/<branch>-<SESSION_ID>`
- [ ] Create PR with detailed description
- [ ] Include summary of changes and test plan

## File Optimization

### Images
- Always use WebP format instead of JPG/PNG for better compression
- Keep original files as backup
- Typical savings: 50-60% size reduction

### Fonts
- Use WOFF2 format for web fonts
- Subset fonts when possible to reduce file size
- Typical savings: 30-40% over TTF/OTF

### Code
- Minimize DOM operations (use smart diffing)
- Cache DOM queries
- Batch DOM updates when possible

## Notes

- This file should be updated after every significant learning or correction
- Keep rules specific, actionable, and concise
- Remove outdated rules as the project evolves
- Prioritize rules that prevent repeated mistakes

---

*Last updated: 2026-02-01*
*Session: HHfIz*
