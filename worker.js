/**
 * Cloudflare Worker for Big Ten Basketball Standings
 * Scrapes WarrenNolan.com and returns JSON with CORS headers
 *
 * Deploy: Copy this entire file to Cloudflare Workers dashboard
 */

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // Fetch WarrenNolan standings
      const response = await fetch(
        'https://www.warrennolan.com/basketball/2026/conference/Big-Ten',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BigTenStandings/1.0)',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`WarrenNolan returned ${response.status}`);
      }

      const html = await response.text();
      const standings = parseHTML(html);

      if (!standings || standings.length === 0) {
        throw new Error('No standings data found');
      }

      // Return JSON with CORS
      return new Response(JSON.stringify({ standings }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300', // 5 min cache
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

/**
 * Parse WarrenNolan HTML to extract standings data
 */
function parseHTML(html) {
  const standings = [];

  try {
    // Find the main standings table
    // WarrenNolan uses a simple table structure
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);

    if (!tables || tables.length === 0) {
      throw new Error('No tables found in HTML');
    }

    // Usually the first or second table contains standings
    // Look for one with "W-L" pattern indicating records
    let standingsTable = null;
    for (const table of tables) {
      if (table.includes('-') && table.includes('<td')) {
        standingsTable = table;
        break;
      }
    }

    if (!standingsTable) {
      throw new Error('Could not find standings table');
    }

    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...standingsTable.matchAll(rowRegex)];

    // Skip header row(s)
    for (let i = 1; i < rows.length; i++) {
      const rowHTML = rows[i][1];

      // Skip if row is a header
      if (rowHTML.includes('<th')) continue;

      // Extract cells
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [...rowHTML.matchAll(cellRegex)].map(m =>
        stripHTML(m[1]).trim()
      );

      if (cells.length < 3) continue; // Need at least team + 2 records

      // Parse cell data
      // Typical format: [Rank/Position, Team, Conf, Overall, NET, ...]
      let teamName = '';
      let confRecord = '';
      let ovrRecord = '';
      let apRank = 999;
      let netRank = null;

      // Figure out which cells have which data
      // Cell 0 or 1 usually has team name
      // Look for the cell that's not a record format
      for (let j = 0; j < Math.min(cells.length, 8); j++) {
        const cell = cells[j];

        if (!cell) continue;

        // Check if it's a record (W-L format)
        if (/^\d+-\d+$/.test(cell)) {
          if (!confRecord) {
            confRecord = cell;
          } else if (!ovrRecord) {
            ovrRecord = cell;
          }
        }
        // Check if it's a ranking number alone (could be AP or NET)
        else if (/^\d+$/.test(cell)) {
          const num = parseInt(cell, 10);
          // AP ranks are typically 1-25
          if (num <= 25 && cell.length <= 2) {
            apRank = num;
          }
          // NET ranks are typically 1-350+
          else if (num > 0 && num <= 400 && !netRank) {
            netRank = num;
          }
        }
        // Otherwise it's likely the team name
        else if (cell.length > 2 && !teamName) {
          teamName = cell;
        }
      }

      // Extract AP rank from team name if present (e.g., "5 Purdue")
      const rankMatch = teamName.match(/^(\d+)\s+(.+)$/);
      if (rankMatch) {
        apRank = parseInt(rankMatch[1], 10);
        teamName = rankMatch[2];
      }

      // Clean up team name
      teamName = teamName
        .replace(/^\d+\.\s*/, '') // Remove "1. " prefix
        .replace(/\s+/g, ' ')
        .trim();

      if (!teamName || !confRecord) continue;

      // Parse records
      const confMatch = confRecord.match(/(\d+)-(\d+)/);
      const ovrMatch = ovrRecord.match(/(\d+)-(\d+)/);

      const confWins = confMatch ? parseInt(confMatch[1], 10) : 0;
      const confLosses = confMatch ? parseInt(confMatch[2], 10) : 0;
      const overallWins = ovrMatch ? parseInt(ovrMatch[1], 10) : confWins;
      const overallLosses = ovrMatch ? parseInt(ovrMatch[2], 10) : confLosses;

      standings.push({
        team: teamName.toUpperCase(),
        conf: confRecord,
        ovr: ovrRecord || confRecord,
        apRank,
        netRank,
        wins: overallWins,
        losses: overallLosses,
        confWins,
        confLosses,
      });
    }
  } catch (error) {
    throw new Error(`Parse error: ${error.message}`);
  }

  return standings;
}

/**
 * Remove HTML tags and decode entities
 */
function stripHTML(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
