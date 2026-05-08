/**
 * Cloudflare Worker for Big Ten Basketball Standings
 * Fetches data from WarrenNolan (standings + NET) and NCAA (AP Poll)
 */

import { getSeasonEndYear } from "./lib/season.js";
import {
  parseWarrenNolanTable,
  parseAPPoll,
  mergeAPRankings,
} from "./lib/scrape.js";

const USER_AGENT = "Mozilla/5.0 (compatible; BigTenStandings/1.0)";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" },
      });
    }

    try {
      const seasonYear = getSeasonEndYear();

      const [warrenNolanResponse, apPollResponse] = await Promise.all([
        fetch(`https://www.warrennolan.com/basketball/${seasonYear}/conference/Big-Ten`, {
          headers: { "User-Agent": USER_AGENT },
        }),
        fetch("https://www.ncaa.com/rankings/basketball-men/d1/associated-press", {
          headers: { "User-Agent": USER_AGENT },
        }),
      ]);

      if (!warrenNolanResponse.ok) {
        throw new Error(`WarrenNolan returned ${warrenNolanResponse.status}`);
      }

      const warrenNolanHTML = await warrenNolanResponse.text();
      const apPollHTML = apPollResponse.ok ? await apPollResponse.text() : "";
      const apPollDegraded = !apPollResponse.ok;

      const standings = parseWarrenNolanTable(warrenNolanHTML);
      if (!standings || standings.length === 0) {
        throw new Error("No standings data found");
      }

      const apRankings = parseAPPoll(apPollHTML);
      mergeAPRankings(standings, apRankings);

      return new Response(
        JSON.stringify({
          standings,
          season: seasonYear,
          apPollDegraded,
          apPollStatus: apPollResponse.status,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
            "Cache-Control": "public, max-age=300",
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }
  },
};
