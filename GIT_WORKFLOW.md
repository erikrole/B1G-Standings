# Git Workflow

## Branches

- **`main`** — production. Auto-deploys to mbb-standings.erikrole.com via Cloudflare Pages.
- **`feature/*`, `bugfix/*`, `hotfix/*`** — short-lived branches off `main`. Open a PR to merge back.

There is no staging branch today; if/when traffic justifies one, set up a `beta` branch and a Cloudflare Pages preview alias.

## Day-to-day

```bash
# Start work
git checkout main
git pull origin main
git checkout -b feature/your-change

# Ship
git push -u origin feature/your-change
# Open a PR to main on GitHub
```

## Commit message format

`type: short description`, where type is one of:
`feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`, `chore`.

## Before merging to `main`

- `npm test` passes
- Manual smoke check (open `index.html`, confirm standings load)
- Cache-bust query strings on `script.js` / `style.css` in `index.html` are bumped if either file changed
