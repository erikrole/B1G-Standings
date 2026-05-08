import { describe, it, expect } from "vitest";
import {
  escapeHTML,
  toDash,
  parseRecord,
  calculateWinPercentage,
  parseCSV,
} from "../lib/parsing.js";

describe("escapeHTML", () => {
  it("escapes the five HTML metacharacters", () => {
    expect(escapeHTML(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&#39;");
  });

  it("coerces non-strings", () => {
    expect(escapeHTML(42)).toBe("42");
    expect(escapeHTML(null)).toBe("null");
  });

  it("leaves safe text untouched", () => {
    expect(escapeHTML("Wisconsin Badgers")).toBe("Wisconsin Badgers");
  });
});

describe("toDash", () => {
  it("returns trimmed value when present", () => {
    expect(toDash("  hello  ")).toBe("hello");
  });

  it("returns empty string for empty/whitespace/null/undefined", () => {
    expect(toDash("")).toBe("");
    expect(toDash("   ")).toBe("");
    expect(toDash(null)).toBe("");
    expect(toDash(undefined)).toBe("");
  });
});

describe("parseRecord", () => {
  it("parses standard hyphenated records", () => {
    expect(parseRecord("12-3")).toEqual({ wins: 12, losses: 3 });
  });

  it("normalizes unicode dashes (en, em, minus)", () => {
    expect(parseRecord("12–3")).toEqual({ wins: 12, losses: 3 });
    expect(parseRecord("12—3")).toEqual({ wins: 12, losses: 3 });
    expect(parseRecord("12−3")).toEqual({ wins: 12, losses: 3 });
  });

  it("returns zeros for empty/missing input", () => {
    expect(parseRecord("")).toEqual({ wins: 0, losses: 0 });
    expect(parseRecord(null)).toEqual({ wins: 0, losses: 0 });
    expect(parseRecord(undefined)).toEqual({ wins: 0, losses: 0 });
  });

  it("returns zeros for non-numeric input", () => {
    expect(parseRecord("abc-def")).toEqual({ wins: 0, losses: 0 });
  });
});

describe("calculateWinPercentage", () => {
  it("computes basic percentage", () => {
    expect(calculateWinPercentage(3, 1)).toBe(0.75);
  });

  it("returns 0 when no games played", () => {
    expect(calculateWinPercentage(0, 0)).toBe(0);
  });

  it("handles undefeated and winless", () => {
    expect(calculateWinPercentage(10, 0)).toBe(1);
    expect(calculateWinPercentage(0, 5)).toBe(0);
  });
});

describe("parseCSV", () => {
  it("parses a simple two-column header + rows", () => {
    const { headers, rows } = parseCSV("TEAM,RECORD\nWISCONSIN,12-3\nMICHIGAN,10-5");
    expect(headers).toEqual(["TEAM", "RECORD"]);
    expect(rows).toEqual([["WISCONSIN", "12-3"], ["MICHIGAN", "10-5"]]);
  });

  it("returns empty result for empty input", () => {
    expect(parseCSV("")).toEqual({ headers: [], rows: [] });
    expect(parseCSV("   ")).toEqual({ headers: [], rows: [] });
  });

  it("handles CRLF line endings", () => {
    const { rows } = parseCSV("A,B\r\n1,2\r\n3,4");
    expect(rows).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("preserves commas inside quoted fields", () => {
    const { rows } = parseCSV(`A,B\n"hello, world",2`);
    expect(rows[0]).toEqual(["hello, world", "2"]);
  });

  it("decodes escaped double-quotes inside quoted fields", () => {
    // Bug fix #3: previous parser silently dropped doubled quotes.
    const { rows } = parseCSV(`A,B\n"she said ""hi""",2`);
    expect(rows[0]).toEqual([`she said "hi"`, "2"]);
  });

  it("preserves embedded newlines inside quoted fields", () => {
    const { rows } = parseCSV(`A,B\n"line1\nline2",ok`);
    expect(rows).toEqual([["line1\nline2", "ok"]]);
  });

  it("does not emit a trailing empty row from a trailing newline", () => {
    const { rows } = parseCSV("A,B\n1,2\n");
    expect(rows).toEqual([["1", "2"]]);
  });
});
