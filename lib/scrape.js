import { NO_RANK_VALUE } from "./constants.js";

// Regex parsers for the worker. Lifted from worker.js so they can be tested
// against fixture HTML without a Cloudflare runtime. Keep these tolerant of
// markup drift — both source sites change presentation periodically.

const TABLE_RE = /<table[^>]*>([\s\S]*?)<\/table>/gi;
const ROW_RE = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
const CELL_RE = /<td[^>]*>([\s\S]*?)<\/td>/gi;
const MIN_STANDINGS_COLUMNS = 8;

// Column layout from WarrenNolan's conference standings:
//   0: rank, 1: team, 2: conf record, 3: conf %, 4: GB,
//   5: overall record, 6: overall %, 7: NET, 8+: Q1...
const COL = {
  TEAM: 1,
  CONF_RECORD: 2,
  OVR_RECORD: 5,
  NET_RANK: 7,
};

export function stripHTML(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseWarrenNolanTable(html) {
  const standings = [];
  const tables = html.match(TABLE_RE);
  if (!tables || tables.length === 0) {
    throw new Error("No tables found");
  }

  // Pick the first table that looks like records (W-L) with multiple rows.
  let standingsTable = null;
  for (const table of tables) {
    if (table.includes("-") && (table.match(/<tr/gi) || []).length > 5) {
      standingsTable = table;
      break;
    }
  }
  if (!standingsTable) {
    throw new Error("Could not find standings table");
  }

  const rows = [...standingsTable.matchAll(ROW_RE)];
  for (let i = 1; i < rows.length; i++) {
    const rowHTML = rows[i][1];
    if (rowHTML.includes("<th")) continue;

    const cells = [...rowHTML.matchAll(CELL_RE)].map(m => stripHTML(m[1]).trim());
    if (cells.length < MIN_STANDINGS_COLUMNS) continue;

    const teamName = cells[COL.TEAM]?.trim();
    const confRecord = cells[COL.CONF_RECORD]?.trim();
    const ovrRecord = cells[COL.OVR_RECORD]?.trim();
    const netRankStr = cells[COL.NET_RANK]?.trim();

    if (!teamName || !confRecord || !ovrRecord) continue;

    const confMatch = confRecord.match(/(\d+)-(\d+)/);
    const ovrMatch = ovrRecord.match(/(\d+)-(\d+)/);
    const confWins = confMatch ? parseInt(confMatch[1], 10) : 0;
    const confLosses = confMatch ? parseInt(confMatch[2], 10) : 0;
    const overallWins = ovrMatch ? parseInt(ovrMatch[1], 10) : 0;
    const overallLosses = ovrMatch ? parseInt(ovrMatch[2], 10) : 0;

    const netRank = netRankStr && /^\d+$/.test(netRankStr) ? parseInt(netRankStr, 10) : null;

    standings.push({
      team: teamName.toUpperCase(),
      conf: confRecord,
      ovr: ovrRecord,
      apRank: NO_RANK_VALUE,
      netRank,
      wins: overallWins,
      losses: overallLosses,
      confWins,
      confLosses,
    });
  }

  return standings;
}

export function parseAPPoll(html) {
  const rankings = {};
  if (!html) return rankings;

  const tables = html.match(TABLE_RE);
  if (!tables || tables.length === 0) return rankings;

  const pollTable = tables[0];
  const rows = [...pollTable.matchAll(ROW_RE)];

  for (let i = 1; i < rows.length; i++) {
    const rowHTML = rows[i][1];
    if (rowHTML.includes("<th")) continue;

    const cells = [...rowHTML.matchAll(CELL_RE)].map(m => stripHTML(m[1]).trim());
    if (cells.length < 2) continue;

    const rank = parseInt(cells[0], 10);
    const teamName = normalizeTeamName(
      cells[1]
        .replace(/\([^)]*\)/g, "")
        .replace(/\d+-\d+/g, "")
        .trim()
    );

    if (rank && teamName) {
      rankings[teamName] = rank;
    }
  }

  return rankings;
}

// AP poll calls schools "Michigan St." while WarrenNolan uses "Michigan State".
// Map abbreviations back to full names so AP merge keys hit.
export function normalizeTeamName(name) {
  const normalized = name.toUpperCase().trim();
  const mapping = {
    "MICHIGAN ST": "MICHIGAN STATE",
    "MICHIGAN ST.": "MICHIGAN STATE",
    "OHIO ST": "OHIO STATE",
    "OHIO ST.": "OHIO STATE",
    "PENN ST": "PENN STATE",
    "PENN ST.": "PENN STATE",
  };
  return mapping[normalized] || normalized;
}

export function mergeAPRankings(standings, apRankings) {
  for (const team of standings) {
    const apRank = apRankings[team.team];
    if (apRank) team.apRank = apRank;
  }
  return standings;
}
