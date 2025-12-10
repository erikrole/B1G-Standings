// =====================
// CONFIG
// =====================
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1bOdPDPKf1QHUyayNgDToaCtu3k6_-bccnWLNqpyayvQ/export?format=csv&gid=1204601349";

// =====================
// CSV PARSING
// =====================
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(","));
  return { headers, rows };
}

// =====================
// UTILITIES
// =====================
const toDash = str => (str && str.trim()) || "";

function parseRecord(str) {
  const clean = (str || "").replace(/[–—−]/g, "-");
  const [wRaw, lRaw] = clean.split("-");
  const wins = parseInt(wRaw, 10) || 0;
  const losses = parseInt(lRaw, 10) || 0;
  return { wins, losses };
}

// =====================
// MAIN LOAD FUNCTION
// =====================
async function loadStandings() {
  try {
    const res = await fetch(`${CSV_URL}&t=${Date.now()}`, { cache: "no-store" });
    const text = await res.text();

    const { headers, rows } = parseCSV(text);

    // Map header names to column indexes
    const headerToIndex = Object.fromEntries(
      headers.map((h, idx) => [h.trim().toUpperCase(), idx])
    );

    const TEAM_COL   = headerToIndex["TEAM"];
    const CONF_COL   = headerToIndex["CONF"];
    const OVR_COL    = headerToIndex["OVR"];
    const AP_COL     = headerToIndex["RANK"];   // AP rank (optional)
    const WINS_COL   = headerToIndex["WINS"];   // helper col in WN_CLEAN (required)
    const LOSSES_COL = headerToIndex["LOSSES"]; // helper col in WN_CLEAN (required)

    // Basic validation
    if (
      TEAM_COL == null ||
      CONF_COL == null ||
      OVR_COL == null ||
      WINS_COL == null ||
      LOSSES_COL == null
    ) {
      console.error("Missing required columns:", headers);
      document.getElementById("table").innerHTML =
        `<div style="padding-top:20px;font-size:24px;opacity:0.7;">
           Missing columns in sheet
         </div>`;
      return;
    }

    // ---- Build objects from rows ----
    const teamRows = rows
      .map((cols, originalIndex) => {
        if (!cols.length) return null;

        const teamRaw = (cols[TEAM_COL] || "").trim();
        if (!teamRaw) return null;

        const team = teamRaw.toUpperCase();
        const confStr = toDash(cols[CONF_COL]);
        const { wins: confWins, losses: confLosses } = parseRecord(confStr);
        const confPct = confWins + confLosses === 0 ? -1 : confWins / (confWins + confLosses);
        const ovr  = toDash(cols[OVR_COL]);
        const apRaw = AP_COL != null ? String(cols[AP_COL] || "").trim() : "";
        const apRank = apRaw ? parseInt(apRaw, 10) || 999 : 999;

        const wins = parseInt(cols[WINS_COL] || "0", 10);
        const losses = parseInt(cols[LOSSES_COL] || "0", 10);

        // Add winning percentage property for sorting
        const pct = wins + losses === 0 ? 0 : wins / (wins + losses);

        return {
          team,
          conf: confStr,
          ovr,
          apRank,
          wins,
          losses,
          pct,
          confWins,
          confLosses,
          confPct,
          isWisconsin: team === "WISCONSIN",
          originalIndex
        };
      })
      .filter(Boolean);

    // ---- Sorting logic (CONF_PCT → CONF_WINS → OVR_PCT → WINS → WISCONSIN → AP RANK → ALPHABETICAL) ----
    teamRows.sort((a, b) => {
      // 1) Conference winning percentage (higher first)
      if (b.confPct !== a.confPct) return b.confPct - a.confPct;

      // 2) Conference wins (more wins first)
      if (b.confWins !== a.confWins) return b.confWins - a.confWins;

      // 3) Overall winning percentage (higher first)
      if (b.pct !== a.pct) return b.pct - a.pct;

      // 4) Overall total wins (more wins first)
      if (b.wins !== a.wins) return b.wins - a.wins;

      // 5) Wisconsin bump among identical records
      if (a.isWisconsin && !b.isWisconsin) return -1;
      if (b.isWisconsin && !a.isWisconsin) return 1;

      // 6) AP ranking: ranked teams first, then lower number is better
      const aRanked = a.apRank < 999;
      const bRanked = b.apRank < 999;

      if (aRanked && !bRanked) return -1;
      if (bRanked && !aRanked) return 1;

      if (aRanked && bRanked && a.apRank !== b.apRank) {
        return a.apRank - b.apRank;
      }

      // 7) Alphabetical fallback
      return a.team.localeCompare(b.team);
    });

    // ---- Render ----
    const tableEl = document.getElementById("table");
    tableEl.innerHTML = "";

    teamRows.forEach((rowData, index) => {
      const { team, conf, ovr, apRank, isWisconsin } = rowData;

      const row = document.createElement("div");
      row.className = "row";
      if (isWisconsin) row.classList.add("wisconsin");

      row.innerHTML = `
        <div class="rank">${index + 1}.</div>
        <div class="team-cell">
          ${apRank < 999 ? `<span class="ap-rank">${apRank}</span>` : ""}
          <span class="team-name">${team}</span>
        </div>
        <div class="conf">${conf}</div>
        <div class="ovr">${ovr}</div>
      `;

      tableEl.appendChild(row);
    });

    const ts = document.getElementById("timestamp");
    if (ts) ts.textContent = "Updated " + new Date().toLocaleString();
  } catch (err) {
    console.error("Error loading CSV:", err);
    document.getElementById("table").innerHTML =
      `<div style="padding-top:20px;font-size:24px;opacity:0.7;">
         Error loading data
       </div>`;
  }
}

// =====================
// INIT + AUTO REFRESH
// =====================
loadStandings();
setInterval(loadStandings, 15 * 60 * 1000);