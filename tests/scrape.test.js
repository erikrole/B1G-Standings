import { describe, it, expect } from "vitest";
import {
  parseWarrenNolanTable,
  parseAPPoll,
  normalizeTeamName,
  mergeAPRankings,
  stripHTML,
} from "../lib/scrape.js";
import { NO_RANK_VALUE } from "../lib/constants.js";

describe("stripHTML", () => {
  it("removes tags and decodes entities", () => {
    expect(stripHTML("<b>Wisconsin</b>&nbsp;Badgers")).toBe("Wisconsin Badgers");
    expect(stripHTML("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(stripHTML("&lt;tag&gt;")).toBe("<tag>");
    expect(stripHTML("&quot;quote&quot;")).toBe('"quote"');
    expect(stripHTML("it&#39;s")).toBe("it's");
  });

  it("collapses whitespace runs", () => {
    expect(stripHTML("foo   \n\t  bar")).toBe("foo bar");
  });
});

describe("normalizeTeamName", () => {
  it("expands common state abbreviations", () => {
    expect(normalizeTeamName("Michigan St")).toBe("MICHIGAN STATE");
    expect(normalizeTeamName("Michigan St.")).toBe("MICHIGAN STATE");
    expect(normalizeTeamName("Ohio St")).toBe("OHIO STATE");
    expect(normalizeTeamName("Penn St.")).toBe("PENN STATE");
  });

  it("uppercases and trims unmapped names", () => {
    expect(normalizeTeamName("  wisconsin  ")).toBe("WISCONSIN");
    expect(normalizeTeamName("Maryland")).toBe("MARYLAND");
  });
});

describe("parseWarrenNolanTable", () => {
  const fixture = `
    <html><body>
      <table>
        <tr><td>label</td><td>only one row</td></tr>
      </table>
      <table>
        <tr><th>Rank</th><th>Team</th><th>Conf</th><th>%</th><th>GB</th><th>Overall</th><th>%</th><th>NET</th><th>Q1</th></tr>
        <tr><td>1</td><td>Purdue</td><td>10-2</td><td>.833</td><td>-</td><td>20-3</td><td>.870</td><td>5</td><td>4-2</td></tr>
        <tr><td>2</td><td>Wisconsin</td><td>9-3</td><td>.750</td><td>1</td><td>18-5</td><td>.783</td><td>15</td><td>3-3</td></tr>
        <tr><td>3</td><td>Michigan</td><td>8-4</td><td>.667</td><td>2</td><td>17-6</td><td>.739</td><td>22</td><td>2-4</td></tr>
        <tr><td>4</td><td>Indiana</td><td>6-6</td><td>.500</td><td>4</td><td>13-10</td><td>.565</td><td>45</td><td>1-5</td></tr>
        <tr><td>5</td><td>Rutgers</td><td>2-10</td><td>.167</td><td>8</td><td>9-14</td><td>.391</td><td></td><td>0-5</td></tr>
      </table>
    </body></html>
  `;

  it("extracts standings rows with the correct shape", () => {
    const standings = parseWarrenNolanTable(fixture);
    expect(standings).toHaveLength(5);
    expect(standings[0]).toEqual({
      team: "PURDUE",
      conf: "10-2",
      ovr: "20-3",
      apRank: NO_RANK_VALUE,
      netRank: 5,
      wins: 20,
      losses: 3,
      confWins: 10,
      confLosses: 2,
    });
  });

  it("returns null netRank when value is missing", () => {
    const standings = parseWarrenNolanTable(fixture);
    const rutgers = standings.find(s => s.team === "RUTGERS");
    expect(rutgers).toBeDefined();
    expect(rutgers.netRank).toBeNull();
  });

  it("uppercases team names", () => {
    const standings = parseWarrenNolanTable(fixture);
    expect(standings.map(s => s.team)).toEqual([
      "PURDUE",
      "WISCONSIN",
      "MICHIGAN",
      "INDIANA",
      "RUTGERS",
    ]);
  });

  it("throws when no tables exist", () => {
    expect(() => parseWarrenNolanTable("<html><body>nope</body></html>")).toThrow(/No tables/);
  });

  it("throws when no table looks like standings", () => {
    expect(() =>
      parseWarrenNolanTable("<table><tr><td>only</td></tr></table>")
    ).toThrow(/standings table/);
  });

  it("ignores rows with too few cells", () => {
    const partial = `
      <table>
        <tr><th>h</th><th>h</th></tr>
        <tr><td>1</td><td>Half row</td></tr>
        <tr><td>1</td><td>Purdue</td><td>10-2</td><td>.833</td><td>-</td><td>20-3</td><td>.870</td><td>5</td></tr>
        <tr><td>2</td><td>Wisconsin</td><td>9-3</td><td>.750</td><td>1</td><td>18-5</td><td>.783</td><td>15</td></tr>
        <tr><td>3</td><td>X</td><td>1-1</td><td>.5</td><td>1</td><td>2-2</td><td>.5</td><td>5</td></tr>
        <tr><td>4</td><td>Y</td><td>1-1</td><td>.5</td><td>1</td><td>2-2</td><td>.5</td><td>5</td></tr>
        <tr><td>5</td><td>Z</td><td>1-1</td><td>.5</td><td>1</td><td>2-2</td><td>.5</td><td>5</td></tr>
      </table>
    `;
    const standings = parseWarrenNolanTable(partial);
    expect(standings.find(s => s.team === "HALF ROW")).toBeUndefined();
  });
});

describe("parseAPPoll", () => {
  const fixture = `
    <table>
      <tr><th>Rank</th><th>Team</th><th>Points</th></tr>
      <tr><td>1</td><td>Nebraska (18-0)</td><td>800</td></tr>
      <tr><td>2</td><td>Purdue (20-3)</td><td>750</td></tr>
      <tr><td>5</td><td>Michigan St.</td><td>500</td></tr>
    </table>
  `;

  it("returns an empty object for empty input", () => {
    expect(parseAPPoll("")).toEqual({});
    expect(parseAPPoll("<html></html>")).toEqual({});
  });

  it("strips records and parens, normalizing names", () => {
    const ranks = parseAPPoll(fixture);
    expect(ranks).toEqual({
      NEBRASKA: 1,
      PURDUE: 2,
      "MICHIGAN STATE": 5,
    });
  });
});

describe("mergeAPRankings", () => {
  it("fills apRank when team matches", () => {
    const standings = [
      { team: "PURDUE", apRank: NO_RANK_VALUE },
      { team: "WISCONSIN", apRank: NO_RANK_VALUE },
    ];
    mergeAPRankings(standings, { PURDUE: 3, NEBRASKA: 1 });
    expect(standings[0].apRank).toBe(3);
    expect(standings[1].apRank).toBe(NO_RANK_VALUE);
  });
});
