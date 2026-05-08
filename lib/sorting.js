import { NO_RANK_VALUE } from "./constants.js";

// Tiebreakers, in order:
//  1. Conference winning %
//  2. Conference wins
//  3. Conference losses (fewer first)
//  4. Overall winning %
//  5. Overall wins
//  6. Wisconsin bump (homer tiebreak among identical records)
//  7. AP rank (ranked > unranked, then lower number)
//  8. NET rank (lower better; nulls sort last)
//  9. Alphabetical
export function compareTeams(a, b) {
  if (b.confPct !== a.confPct) return b.confPct - a.confPct;
  if (b.confWins !== a.confWins) return b.confWins - a.confWins;
  if (a.confLosses !== b.confLosses) return a.confLosses - b.confLosses;
  if (b.pct !== a.pct) return b.pct - a.pct;
  if (b.wins !== a.wins) return b.wins - a.wins;

  if (a.isWisconsin && !b.isWisconsin) return -1;
  if (b.isWisconsin && !a.isWisconsin) return 1;

  const aRanked = a.apRank < NO_RANK_VALUE;
  const bRanked = b.apRank < NO_RANK_VALUE;
  if (aRanked && !bRanked) return -1;
  if (bRanked && !aRanked) return 1;
  if (aRanked && bRanked && a.apRank !== b.apRank) return a.apRank - b.apRank;

  const aHasNet = a.netRank != null;
  const bHasNet = b.netRank != null;
  if (aHasNet && !bHasNet) return -1;
  if (bHasNet && !aHasNet) return 1;
  if (aHasNet && bHasNet && a.netRank !== b.netRank) return a.netRank - b.netRank;

  return a.team.localeCompare(b.team);
}
