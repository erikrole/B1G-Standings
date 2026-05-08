// Season runs Nov 4 → Apr 10. Outside that range we treat as offseason.
// Centralized so script.js, worker.js, and the offseason banner agree.

export function isOffseason(now = new Date()) {
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  if (month >= 4 && month <= 9) return true;   // May–October
  if (month === 3 && day > 10) return true;    // After April 10
  if (month === 10 && day < 4) return true;    // Before November 4
  return false;
}

// Returns the year that the current season ends in (e.g. 2026 for the 2025-26 season).
// WarrenNolan and most data sources key URLs by season-end year, so we use this to
// build the worker's request URL — never `new Date().getFullYear()`.
export function getSeasonEndYear(now = new Date()) {
  const year = now.getFullYear();
  return now.getMonth() >= 10 ? year + 1 : year;
}

// "2025-26" style label for display.
export function getSeasonLabel(now = new Date()) {
  const endYear = getSeasonEndYear(now);
  return `${endYear - 1}-${String(endYear).slice(2)}`;
}
