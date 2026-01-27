# Quick Deployment Guide

## Step 1: Deploy Cloudflare Worker (5 minutes)

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com/
   - Sign in (or create free account if needed)

2. **Create Worker**
   - Click "Workers & Pages" in left sidebar
   - Click "Create Application"
   - Click "Create Worker"
   - Name it: `big-ten-standings`
   - Click "Deploy"

3. **Edit Worker Code**
   - Click "Edit Code" button
   - Delete all the default code
   - Copy ALL content from `worker.js` file
   - Paste into the editor
   - Click "Save and Deploy"

4. **Copy Worker URL**
   - You'll see a URL like: `https://big-ten-standings.YOUR-NAME.workers.dev`
   - Copy this URL - you'll need it next

## Step 2: Test Worker (1 minute)

1. Open your worker URL in a browser
2. You should see JSON data like:
   ```json
   {
     "standings": [
       {
         "team": "NEBRASKA",
         "conf": "9-0",
         "ovr": "20-0",
         "apRank": 8,
         ...
       }
     ]
   }
   ```

3. If you see this, SUCCESS! Continue to Step 3.

4. If you see an error:
   - Check Cloudflare Workers logs in dashboard
   - The worker might need HTML parsing adjustments
   - Let me know and I'll help debug

## Step 3: Update Your Code (2 minutes)

1. **Edit `script.js`** - Find line 4-5 and update:

   ```javascript
   // OLD (Google Sheets)
   const CSV_URL = "https://docs.google.com/spreadsheets/...";

   // NEW (Cloudflare Worker)
   const WORKER_URL = "https://big-ten-standings.YOUR-NAME.workers.dev";
   const USE_WORKER = true; // Set to false to fallback to Google Sheets
   ```

2. **Find the `loadStandings()` function** around line 240 and replace with:

   ```javascript
   async function loadStandings() {
     setLoadingState(true);

     try {
       let teams;

       if (USE_WORKER) {
         // Fetch from Cloudflare Worker
         const res = await fetch(`${WORKER_URL}?t=${Date.now()}`, {
           cache: "no-store"
         });

         if (!res.ok) {
           throw new Error(`Worker error: ${res.status}`);
         }

         const data = await res.json();
         teams = data.standings.map(team => ({
           ...team,
           pct: calculateWinPercentage(team.wins, team.losses),
           confPct: calculateWinPercentage(team.confWins, team.confLosses),
           isWisconsin: team.team === "WISCONSIN",
         }));
       } else {
         // Fallback: Use existing CSV logic
         const res = await fetch(`${CSV_URL}&t=${Date.now()}`, {
           cache: "no-store"
         });
         // ... existing CSV parsing code ...
       }

       // Sort and render (existing code)
       teams.sort(compareTeams);
       // ... rest of existing code ...
     } catch (err) {
       console.error("Error loading standings:", err);
       // ... existing error handling ...
     }
   }
   ```

## Step 4: Test Locally (1 minute)

1. Open `index.html` in your browser
2. Check browser console (F12) for any errors
3. Verify standings display correctly
4. Check that timestamp shows "Today at X:XX AM"

## Step 5: Deploy to Production

1. Commit and push:
   ```bash
   git add script.js
   git commit -m "Switch to Cloudflare Worker for data source"
   git push origin claude/espn-api-implementation-HHfIz
   ```

2. Merge to main via GitHub PR

3. Your Cloudflare Pages will auto-deploy!

## Rollback Plan

If something goes wrong, simply:

1. Edit `script.js` line 5:
   ```javascript
   const USE_WORKER = false; // Back to Google Sheets
   ```

2. Commit and push - Google Sheets will work immediately

## Troubleshooting

### Worker returns empty standings
- WarrenNolan changed their HTML structure
- Check browser devtools network tab for worker response
- May need to adjust `parseHTML()` function in `worker.js`

### Data looks wrong
- Check worker logs in Cloudflare dashboard
- Verify WarrenNolan page structure hasn't changed
- Compare worker output with Google Sheets data

### Still using old data
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check that `USE_WORKER = true` in script.js

## Benefits You'll Get

✅ **Faster updates** - Every 5-15 minutes instead of hourly
✅ **Cleaner stack** - No Google Sheets middleman
✅ **More control** - Adjust cache timing, add features
✅ **Free** - Cloudflare Workers free tier is 100k requests/day

## Questions?

Open an issue or check the README!
