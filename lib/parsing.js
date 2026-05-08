// CSV + record parsing helpers. Pure functions, safe for browser/worker/node.

const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ESCAPE_MAP[c]);
}

export const toDash = str => (str && str.trim()) || "";

// Parse "12-3" style records, including unicode dashes from copy-pasted sheets.
export function parseRecord(str) {
  const clean = (str || "").replace(/[–—−]/g, "-");
  const [wRaw, lRaw] = clean.split("-");
  const wins = parseInt(wRaw, 10) || 0;
  const losses = parseInt(lRaw, 10) || 0;
  return { wins, losses };
}

export function calculateWinPercentage(wins, losses) {
  const total = wins + losses;
  return total === 0 ? 0 : wins / total;
}

// RFC 4180-ish CSV parser: handles quoted fields and escaped quotes (""),
// which the previous implementation silently dropped.
export function parseCSV(text) {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [], rows: [] };

  const allRows = parseRows(trimmed);
  if (allRows.length === 0) return { headers: [], rows: [] };

  const headers = allRows[0].map(h => h.trim());
  const rows = allRows.slice(1);
  return { headers, rows };
}

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && text[i + 1] === "\n") i++;
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}
