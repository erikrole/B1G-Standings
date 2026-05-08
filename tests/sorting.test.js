import { describe, it, expect } from "vitest";
import { compareTeams } from "../lib/sorting.js";
import { NO_RANK_VALUE } from "../lib/constants.js";

// Helper to keep test cases readable.
function team(overrides = {}) {
  return {
    team: "TEAM A",
    confWins: 0,
    confLosses: 0,
    confPct: 0,
    wins: 0,
    losses: 0,
    pct: 0,
    isWisconsin: false,
    apRank: NO_RANK_VALUE,
    netRank: null,
    ...overrides,
  };
}

function sorted(teams) {
  return [...teams].sort(compareTeams).map(t => t.team);
}

describe("compareTeams tiebreakers", () => {
  it("sorts by conference winning % first", () => {
    const a = team({ team: "A", confWins: 9, confLosses: 1, confPct: 0.9 });
    const b = team({ team: "B", confWins: 5, confLosses: 5, confPct: 0.5 });
    expect(sorted([b, a])).toEqual(["A", "B"]);
  });

  it("when conf% ties, more conf wins beats fewer conf wins", () => {
    const a = team({ team: "A", confWins: 6, confLosses: 4, confPct: 0.6 });
    const b = team({ team: "B", confWins: 3, confLosses: 2, confPct: 0.6 });
    expect(sorted([b, a])).toEqual(["A", "B"]);
  });

  it("when conf% and conf wins tie, fewer conf losses wins", () => {
    const a = team({ team: "A", confWins: 6, confLosses: 4, confPct: 0.6 });
    const b = team({ team: "B", confWins: 6, confLosses: 4, confPct: 0.6 });
    // identical here; fall through to overall
    expect(sorted([a, b])).toEqual(["A", "B"]);
  });

  it("falls through to overall winning %", () => {
    const a = team({ team: "A", pct: 0.85, wins: 17, losses: 3 });
    const b = team({ team: "B", pct: 0.75, wins: 15, losses: 5 });
    expect(sorted([b, a])).toEqual(["A", "B"]);
  });

  it("Wisconsin breaks ties with otherwise-identical records", () => {
    const a = team({ team: "WISCONSIN", isWisconsin: true });
    const b = team({ team: "MICHIGAN" });
    expect(sorted([b, a])).toEqual(["WISCONSIN", "MICHIGAN"]);
  });

  it("AP-ranked teams sort above unranked when records tie", () => {
    const a = team({ team: "A", apRank: 5 });
    const b = team({ team: "B", apRank: NO_RANK_VALUE });
    expect(sorted([b, a])).toEqual(["A", "B"]);
  });

  it("among AP-ranked teams, lower AP rank is better", () => {
    const a = team({ team: "A", apRank: 3 });
    const b = team({ team: "B", apRank: 12 });
    expect(sorted([b, a])).toEqual(["A", "B"]);
  });

  it("teams with NET rank sort above teams without", () => {
    const a = team({ team: "A", netRank: 50 });
    const b = team({ team: "B", netRank: null });
    expect(sorted([b, a])).toEqual(["A", "B"]);
  });

  it("among NET-ranked teams, lower NET rank is better", () => {
    const a = team({ team: "A", netRank: 10 });
    const b = team({ team: "B", netRank: 50 });
    expect(sorted([b, a])).toEqual(["A", "B"]);
  });

  it("falls through to alphabetical when everything ties", () => {
    const a = team({ team: "ALPHA" });
    const b = team({ team: "BRAVO" });
    expect(sorted([b, a])).toEqual(["ALPHA", "BRAVO"]);
  });
});

describe("compareTeams real-world scenarios", () => {
  it("orders a realistic standings snapshot correctly", () => {
    const teams = [
      team({ team: "PURDUE", confWins: 9, confLosses: 1, confPct: 0.9, wins: 18, losses: 2, pct: 0.9, apRank: 3, netRank: 5 }),
      team({ team: "WISCONSIN", isWisconsin: true, confWins: 7, confLosses: 3, confPct: 0.7, wins: 15, losses: 5, pct: 0.75, apRank: 12, netRank: 18 }),
      team({ team: "MICHIGAN", confWins: 7, confLosses: 3, confPct: 0.7, wins: 15, losses: 5, pct: 0.75, apRank: 18, netRank: 22 }),
      team({ team: "RUTGERS", confWins: 2, confLosses: 8, confPct: 0.2, wins: 8, losses: 12, pct: 0.4 }),
    ];
    expect(sorted(teams)).toEqual(["PURDUE", "WISCONSIN", "MICHIGAN", "RUTGERS"]);
  });
});
