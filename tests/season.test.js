import { describe, it, expect } from "vitest";
import { isOffseason, getSeasonEndYear, getSeasonLabel } from "../lib/season.js";

describe("isOffseason", () => {
  it("returns true in summer months", () => {
    expect(isOffseason(new Date(2026, 5, 1))).toBe(true);  // June
    expect(isOffseason(new Date(2026, 7, 15))).toBe(true); // August
    expect(isOffseason(new Date(2026, 9, 30))).toBe(true); // October
  });

  it("returns true after April 10 and before November 4", () => {
    expect(isOffseason(new Date(2026, 3, 11))).toBe(true);  // Apr 11
    expect(isOffseason(new Date(2026, 10, 3))).toBe(true);  // Nov 3
  });

  it("returns false during the heart of the season", () => {
    expect(isOffseason(new Date(2026, 0, 15))).toBe(false); // January
    expect(isOffseason(new Date(2026, 1, 28))).toBe(false); // February
    expect(isOffseason(new Date(2025, 11, 25))).toBe(false); // December
  });

  it("treats season boundaries inclusively", () => {
    expect(isOffseason(new Date(2026, 3, 10))).toBe(false); // Apr 10
    expect(isOffseason(new Date(2026, 10, 4))).toBe(false); // Nov 4
  });
});

describe("getSeasonEndYear", () => {
  it("returns the next calendar year during Nov/Dec", () => {
    expect(getSeasonEndYear(new Date(2025, 10, 15))).toBe(2026);
    expect(getSeasonEndYear(new Date(2025, 11, 31))).toBe(2026);
  });

  it("returns the current calendar year during Jan-Oct", () => {
    expect(getSeasonEndYear(new Date(2026, 0, 1))).toBe(2026);
    expect(getSeasonEndYear(new Date(2026, 2, 31))).toBe(2026);
    expect(getSeasonEndYear(new Date(2026, 9, 1))).toBe(2026);
  });
});

describe("getSeasonLabel", () => {
  it("formats as YYYY-YY using season-end year", () => {
    expect(getSeasonLabel(new Date(2025, 10, 15))).toBe("2025-26");
    expect(getSeasonLabel(new Date(2026, 1, 14))).toBe("2025-26");
    expect(getSeasonLabel(new Date(2026, 5, 1))).toBe("2025-26");
  });

  it("handles century boundary correctly", () => {
    expect(getSeasonLabel(new Date(2099, 11, 15))).toBe("2099-00");
    expect(getSeasonLabel(new Date(2100, 1, 15))).toBe("2099-00");
  });
});
