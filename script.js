import { NO_RANK_VALUE } from "./lib/constants.js";
import { isOffseason, getSeasonLabel, getSeasonEndYear } from "./lib/season.js";
import {
  escapeHTML,
  toDash,
  parseRecord,
  calculateWinPercentage,
  parseCSV,
} from "./lib/parsing.js";
import { compareTeams } from "./lib/sorting.js";

// =====================
// CONFIG
// =====================
const USE_WORKER = true;
const WORKER_URL = "https://big-ten-standings.erikrole.workers.dev";
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1bOdPDPKf1QHUyayNgDToaCtu3k6_-bccnWLNqpyayvQ/export?format=csv&gid=1204601349";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const STALE_DATA_THRESHOLD_MS = 30 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;
const POSITION_CHANGE_DURATION_MS = 5000;
const MAX_WORKER_FAILURES_BEFORE_FALLBACK = 2;
const WORKER_RECOVERY_COOLDOWN_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10 * 1000;
const MAX_RETRY_ATTEMPTS = 6;
const TABLE_COLUMNS = 4;
const SKELETON_ROW_COUNT = 18;

// Debug logging is opt-in via `?debug=1` URL param or `localStorage.debug = '1'`.
const DEBUG = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "1") return true;
    return window.localStorage?.getItem("debug") === "1";
  } catch {
    return false;
  }
})();

// =====================
// STATE
// =====================
const state = {
  wakeLock: null,
  lastSuccessfulUpdate: null,
  previousStandings: new Map(),
  positionChangeTimers: new Map(),
  retryCount: 0,
  refreshTimer: null,
  retryTimer: null,
  consecutiveWorkerFailures: 0,
  workerFallbackUntil: 0,
  headerInserted: false,
  firstRender: true,
  isLoading: false,
  onlineDebounceTimer: null,
  offseason: false,
};

// =====================
// CACHED DOM REFERENCES
// =====================
const dom = {
  table: document.getElementById("table"),
  tableHead: document.getElementById("table-head"),
  tableBody: document.getElementById("table-body"),
  loadingIndicator: document.getElementById("loading-indicator"),
  refreshBtn: document.getElementById("refresh-btn"),
  statusIndicator: document.getElementById("status-indicator"),
  statusLabel: document.getElementById("status-indicator")?.querySelector(".status-label"),
  timestamp: document.getElementById("timestamp"),
};

// =====================
// DOM HELPERS
// =====================
function showError(message) {
  if (!dom.tableBody) return;
  dom.tableBody.innerHTML = `<tr><td colspan="${TABLE_COLUMNS}" class="error-message" role="alert">${escapeHTML(message)}</td></tr>`;
  // The header lives in <thead>, not <tbody>. Clear it explicitly so the
  // next successful render doesn't append a second header row.
  if (dom.tableHead) dom.tableHead.innerHTML = "";
  state.headerInserted = false;
  state.firstRender = true;
}

function showSkeleton() {
  if (!dom.tableBody || dom.tableBody.querySelector(".row")) return;
  for (let i = 0; i < SKELETON_ROW_COUNT; i++) {
    const row = document.createElement("tr");
    row.className = "skeleton-row";
    row.innerHTML = `
      <td><div class="skeleton-bar skeleton-rank"></div></td>
      <td><div class="skeleton-bar skeleton-team"></div></td>
      <td><div class="skeleton-bar skeleton-conf"></div></td>
      <td><div class="skeleton-bar skeleton-ovr"></div></td>
    `;
    dom.tableBody.appendChild(row);
  }
}

function clearSkeleton() {
  if (!dom.tableBody) return;
  const skeletons = dom.tableBody.querySelectorAll(".skeleton-row");
  skeletons.forEach(el => {
    el.style.opacity = "0";
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  });
  // transitionend can be skipped if the element is removed while hidden.
  setTimeout(() => skeletons.forEach(el => el.remove()), 300);
}

function setLoadingState(loading) {
  state.isLoading = loading;
  if (dom.loadingIndicator) {
    dom.loadingIndicator.style.display = loading ? "block" : "none";
  }
  if (dom.refreshBtn) {
    dom.refreshBtn.disabled = loading;
    dom.refreshBtn.classList.toggle("spinning", loading);
  }
}

function updateStatusIndicator(status) {
  if (!dom.statusIndicator || !dom.statusLabel) return;

  dom.statusIndicator.classList.remove("connected", "csv", "failed");

  if (status === "connected") {
    dom.statusIndicator.classList.add("connected");
    dom.statusLabel.textContent = "Connected";
  } else if (status === "csv") {
    // Class name kept for CSS compatibility; label says "Backup" so non-
    // technical viewers understand the data is from a fallback source.
    dom.statusIndicator.classList.add("csv");
    dom.statusLabel.textContent = "Backup";
  } else if (status === "failed") {
    dom.statusIndicator.classList.add("failed");
    dom.statusLabel.textContent = "Failed";
  } else if (status === "offseason") {
    dom.statusIndicator.classList.add("csv");
    dom.statusLabel.textContent = "Final";
  }
}

function showOffseasonBanner() {
  const banner = document.getElementById("offseason-banner");
  const title = document.getElementById("offseason-title");
  const note = document.getElementById("offseason-note");
  if (!banner || !title || !note) return;

  title.textContent = `${getSeasonLabel()} FINAL STANDINGS`;
  note.textContent = `Next season begins November ${getSeasonEndYear()}`;
  banner.style.display = "block";

  if (dom.timestamp) dom.timestamp.textContent = "";
}

function updateTimestamp() {
  if (!dom.timestamp) return;

  if (!state.lastSuccessfulUpdate) {
    dom.timestamp.textContent = "Waiting for data...";
    dom.timestamp.className = "timestamp";
    dom.timestamp.removeAttribute("title");
    return;
  }

  const now = Date.now();
  const isStale = now - state.lastSuccessfulUpdate > STALE_DATA_THRESHOLD_MS;
  const updateDate = new Date(state.lastSuccessfulUpdate);
  const nowDate = new Date(now);
  const isToday = updateDate.toDateString() === nowDate.toDateString();
  const isYesterday = new Date(now - 86400000).toDateString() === updateDate.toDateString();

  const timeString = updateDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  let datePrefix;
  if (isToday) datePrefix = "today";
  else if (isYesterday) datePrefix = "yesterday";
  else datePrefix = updateDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });

  dom.timestamp.textContent = `Last updated ${datePrefix} at ${timeString}`;
  dom.timestamp.className = isStale ? "timestamp stale" : "timestamp";
  dom.timestamp.title = updateDate.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    state.wakeLock = await navigator.wakeLock.request("screen");
    if (DEBUG) console.log("Wake lock acquired");
    state.wakeLock.addEventListener("release", () => {
      if (DEBUG) console.log("Wake lock released");
    });
  } catch (err) {
    console.error("Wake lock error:", err);
  }
}

function calculateRetryDelay() {
  const baseDelay = 1000;
  return Math.min(baseDelay * Math.pow(2, state.retryCount), MAX_RETRY_DELAY_MS);
}

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

// =====================
// TABLE RENDERING
// =====================
function createTeamRow(rowData, index) {
  const { team, conf, ovr, apRank, netRank, isWisconsin } = rowData;
  const currentPosition = index + 1;

  const row = document.createElement("tr");
  row.className = "row";
  if (isWisconsin) row.classList.add("wisconsin");
  row.dataset.team = team;

  let changeText = "";
  const previousPosition = state.previousStandings.get(team);
  if (previousPosition !== undefined && previousPosition !== currentPosition) {
    const positionChange = previousPosition - currentPosition;
    row.classList.add("position-changed");

    if (positionChange > 0) {
      row.classList.add("moved-up");
      changeText = `↑${positionChange}`;
    } else {
      row.classList.add("moved-down");
      changeText = `↓${Math.abs(positionChange)}`;
    }

    const existingTimer = state.positionChangeTimers.get(team);
    if (existingTimer) clearTimeout(existingTimer);

    const timerId = setTimeout(() => {
      row.classList.remove("position-changed", "moved-up", "moved-down");
      const indicator = row.querySelector(".position-change-indicator");
      if (indicator) indicator.remove();
      state.positionChangeTimers.delete(team);
    }, POSITION_CHANGE_DURATION_MS);
    state.positionChangeTimers.set(team, timerId);
  }

  const changeIndicator = changeText
    ? `<span class="position-change-indicator" aria-label="Moved ${changeText[0] === "↑" ? "up" : "down"} ${changeText.slice(1)} position${changeText.slice(1) === "1" ? "" : "s"}">${escapeHTML(changeText)}</span>`
    : "";

  row.innerHTML = `
    <td class="rank">${currentPosition}.</td>
    <td class="team-cell">
      ${apRank < NO_RANK_VALUE ? `<span class="ap-rank">${apRank}</span>` : ""}
      <span class="team-name">${escapeHTML(team)}</span>
      ${netRank != null ? `<span class="net-rank">NET ${netRank}</span>` : ""}
      ${changeIndicator}
    </td>
    <td class="conf">${escapeHTML(conf)}</td>
    <td class="ovr">${escapeHTML(ovr)}</td>
  `;

  return row;
}

function ensureTableHeader() {
  if (state.headerInserted) return;
  const header = document.createElement("tr");
  header.className = "table-header";
  header.innerHTML = `
    <th class="rank"></th>
    <th class="team-cell header-label">TEAM</th>
    <th class="conf header-label">CONF</th>
    <th class="ovr header-label">OVR</th>
  `;
  dom.tableHead.appendChild(header);
  state.headerInserted = true;
}

function updateTable(newTeamRows) {
  if (!dom.tableBody) return;
  ensureTableHeader();
  const existingRows = Array.from(dom.tableBody.querySelectorAll(".row:not(.table-header)"));

  newTeamRows.forEach((rowData, index) => {
    const existingRow = existingRows[index];

    if (!existingRow) {
      const newRow = createTeamRow(rowData, index);
      if (state.firstRender) {
        newRow.classList.add("row-enter");
        newRow.style.setProperty("--row-index", index);
      }
      dom.tableBody.appendChild(newRow);
    } else if (needsUpdate(existingRow, rowData, index)) {
      const newRow = createTeamRow(rowData, index);
      dom.tableBody.replaceChild(newRow, existingRow);
    }
  });

  const allRows = dom.tableBody.querySelectorAll(".row:not(.table-header)");
  for (let i = newTeamRows.length; i < allRows.length; i++) {
    allRows[i].remove();
  }

  state.firstRender = false;
}

function needsUpdate(row, newData, newIndex) {
  const confCell = row.querySelector(".conf");
  const ovrCell = row.querySelector(".ovr");
  const rankCell = row.querySelector(".rank");
  const apRankSpan = row.querySelector(".ap-rank");
  const netRankSpan = row.querySelector(".net-rank");

  const currentApRank = apRankSpan ? apRankSpan.textContent : "";
  const expectedApRank = newData.apRank < NO_RANK_VALUE ? String(newData.apRank) : "";

  const currentNetRank = netRankSpan ? netRankSpan.textContent : "";
  const expectedNetRank = newData.netRank != null ? `NET ${newData.netRank}` : "";

  return (
    row.dataset.team !== newData.team ||
    confCell?.textContent !== newData.conf ||
    ovrCell?.textContent !== newData.ovr ||
    rankCell?.textContent !== `${newIndex + 1}.` ||
    currentApRank !== expectedApRank ||
    currentNetRank !== expectedNetRank
  );
}

// =====================
// MAIN LOAD FUNCTION
// =====================
async function loadStandings() {
  setLoadingState(true);
  showSkeleton();

  try {
    let teamRows;
    let loadedFromWorker = false;

    if (state.offseason) {
      teamRows = await loadFromCSV();
    } else {
      const canAttemptWorker = USE_WORKER && Date.now() >= state.workerFallbackUntil;

      if (canAttemptWorker) {
        try {
          teamRows = await loadFromWorker();
          loadedFromWorker = true;
          state.consecutiveWorkerFailures = 0;
        } catch (workerErr) {
          state.consecutiveWorkerFailures += 1;
          if (DEBUG) console.error("Worker failed, attempting CSV fallback:", workerErr);

          if (state.consecutiveWorkerFailures >= MAX_WORKER_FAILURES_BEFORE_FALLBACK) {
            state.workerFallbackUntil = Date.now() + WORKER_RECOVERY_COOLDOWN_MS;
            if (DEBUG) console.warn(
              `Worker fallback cooldown enabled until ${new Date(state.workerFallbackUntil).toLocaleTimeString()}`
            );
          }

          teamRows = await loadFromCSV();
        }
      } else {
        teamRows = await loadFromCSV();

        if (DEBUG && USE_WORKER && state.workerFallbackUntil && Date.now() < state.workerFallbackUntil) {
          const minutesRemaining = Math.ceil((state.workerFallbackUntil - Date.now()) / 60000);
          console.log(`Using CSV while worker cools down (${minutesRemaining} min remaining)`);
        }
      }
    }

    teamRows.sort(compareTeams);

    clearSkeleton();
    updateTable(teamRows);

    state.previousStandings.clear();
    teamRows.forEach((rowData, index) => {
      state.previousStandings.set(rowData.team, index + 1);
    });

    state.lastSuccessfulUpdate = Date.now();
    state.retryCount = 0;

    if (state.offseason) {
      showOffseasonBanner();
      updateStatusIndicator("offseason");
    } else {
      updateTimestamp();
      updateStatusIndicator(loadedFromWorker ? "connected" : "csv");
    }
    setLoadingState(false);
  } catch (err) {
    console.error("Error loading data:", err);
    clearSkeleton();
    setLoadingState(false);
    updateStatusIndicator("failed");

    if (!state.offseason) {
      state.retryCount++;
      if (state.retryCount <= MAX_RETRY_ATTEMPTS) {
        const retryDelay = calculateRetryDelay();
        if (DEBUG) console.log(`Retrying in ${retryDelay}ms (attempt ${state.retryCount})`);
        if (state.retryTimer) clearTimeout(state.retryTimer);
        state.retryTimer = setTimeout(() => loadStandings(), retryDelay);
      }
    }

    if (!state.lastSuccessfulUpdate) {
      showError(state.offseason ? "Standings unavailable" : "Error loading data - retrying...");
    }
  }
}

async function loadFromWorker() {
  if (DEBUG) console.log("Fetching from Cloudflare Worker...");
  const res = await fetchWithTimeout(`${WORKER_URL}?t=${Date.now()}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Worker error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.standings || data.standings.length === 0) {
    throw new Error("No standings data from worker");
  }

  if (DEBUG && data.apPollDegraded) {
    console.warn(`AP poll degraded (status ${data.apPollStatus}); rankings may be missing`);
  }

  const teamRows = data.standings.map(team => ({
    ...team,
    pct: calculateWinPercentage(team.wins, team.losses),
    confPct: calculateWinPercentage(team.confWins, team.confLosses),
    isWisconsin: team.team === "WISCONSIN",
  }));

  if (DEBUG) console.log(`✓ Loaded ${teamRows.length} teams from Worker`);
  return teamRows;
}

async function loadFromCSV() {
  if (DEBUG) console.log("Fetching from Google Sheets CSV...");
  const res = await fetchWithTimeout(`${CSV_URL}&t=${Date.now()}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`CSV error: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/") && !contentType.includes("csv")) {
    throw new Error(`Unexpected CSV content-type: ${contentType}`);
  }

  const text = await res.text();
  const { headers, rows } = parseCSV(text);

  const headerToIndex = Object.fromEntries(
    headers.map((h, idx) => [h.trim().toUpperCase(), idx])
  );

  const TEAM_COL = headerToIndex["TEAM"];
  const CONF_COL = headerToIndex["CONF"];
  const OVR_COL = headerToIndex["OVR"];
  const AP_COL = headerToIndex["RANK"];
  const WINS_COL = headerToIndex["WINS"];
  const LOSSES_COL = headerToIndex["LOSSES"];

  if (
    TEAM_COL == null ||
    CONF_COL == null ||
    OVR_COL == null ||
    WINS_COL == null ||
    LOSSES_COL == null
  ) {
    console.error("Missing required columns:", headers);
    throw new Error("Missing columns in CSV data");
  }

  const teamRows = rows
    .map(cols => {
      if (!cols.length) return null;

      const teamRaw = (cols[TEAM_COL] || "").trim();
      if (!teamRaw) return null;

      const team = teamRaw.toUpperCase();
      const confStr = toDash(cols[CONF_COL]);
      const { wins: confWins, losses: confLosses } = parseRecord(confStr);
      const confPct = calculateWinPercentage(confWins, confLosses);
      const ovr = toDash(cols[OVR_COL]);
      const apRaw = AP_COL != null ? String(cols[AP_COL] || "").trim() : "";
      const apParsed = apRaw !== "" ? parseInt(apRaw, 10) : NaN;
      const apRank = Number.isFinite(apParsed) ? apParsed : NO_RANK_VALUE;

      const wins = parseInt(cols[WINS_COL] || "0", 10);
      const losses = parseInt(cols[LOSSES_COL] || "0", 10);
      const pct = calculateWinPercentage(wins, losses);

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
      };
    })
    .filter(Boolean);

  if (DEBUG) console.log(`✓ Loaded ${teamRows.length} teams from CSV`);
  return teamRows;
}

function scheduleNextRefresh() {
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  state.refreshTimer = setTimeout(() => {
    loadStandings();
    scheduleNextRefresh();
  }, REFRESH_INTERVAL_MS);
}

// =====================
// INIT + AUTO REFRESH
// =====================
state.offseason = isOffseason();

if (dom.refreshBtn) {
  dom.refreshBtn.addEventListener("click", () => {
    if (!state.isLoading) {
      loadStandings();
      if (!state.offseason) scheduleNextRefresh();
    }
  });
}

requestWakeLock();

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  // The wake lock object can persist with `released === true` after the
  // tab is hidden. Treat anything other than an active lock as "needs reacquire."
  const needsReacquire = !state.wakeLock || state.wakeLock.released;
  if (needsReacquire) await requestWakeLock();
});

window.addEventListener("online", () => {
  if (state.offseason) return;
  clearTimeout(state.onlineDebounceTimer);
  state.onlineDebounceTimer = setTimeout(() => loadStandings(), 300);
});

if (!state.offseason) {
  setInterval(updateTimestamp, 60 * 1000);
}

loadStandings();
if (!state.offseason) {
  scheduleNextRefresh();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      if (DEBUG) console.warn("Service worker registration failed:", err);
    });
  });
}
