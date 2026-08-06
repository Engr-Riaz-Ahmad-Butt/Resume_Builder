import { describe, expect, it } from "vite-plus/test";

import { formatDate, formatPeriod, formatSingleDate } from "./date";

describe("formatDate", () => {
  it("formats YYYY-MM-DD to month year by default", () => {
    expect(formatDate("2024-01-15")).toBe("January 2024");
  });

  it("formats YYYY-MM to month year", () => {
    expect(formatDate("2024-06")).toBe("June 2024");
  });

  it("returns year only for YYYY", () => {
    expect(formatDate("2024")).toBe("2024");
  });

  it("includes day when includeDay is true", () => {
    expect(formatDate("2024-01-15", true)).toBe("January 15, 2024");
  });

  it("formats YYYY-MM with includeDay (no day available)", () => {
    expect(formatDate("2024-06", true)).toBe("June 2024");
  });

  it("handles December correctly", () => {
    expect(formatDate("2023-12-25")).toBe("December 2023");
  });
});

describe("formatPeriod", () => {
  it("returns empty string when both dates are missing", () => {
    expect(formatPeriod()).toBe("");
    expect(formatPeriod(undefined, undefined)).toBe("");
  });

  it("returns end date when start is missing", () => {
    expect(formatPeriod(undefined, "2024-06")).toBe("2024-06");
  });

  it("returns 'Start - Present' when end is missing", () => {
    expect(formatPeriod("2024-01")).toBe("January 2024 - Present");
  });

  it("formats both dates", () => {
    expect(formatPeriod("2020-01", "2024-06")).toBe("January 2020 - June 2024");
  });

  it("formats full dates to month-year", () => {
    expect(formatPeriod("2020-01-15", "2024-06-30")).toBe("January 2020 - June 2024");
  });
});

describe("formatSingleDate", () => {
  it("returns empty string for undefined", () => {
    expect(formatSingleDate()).toBe("");
    expect(formatSingleDate(undefined)).toBe("");
  });

  it("formats YYYY-MM-DD with day included", () => {
    expect(formatSingleDate("2024-03-15")).toBe("March 15, 2024");
  });

  it("formats YYYY-MM without day", () => {
    expect(formatSingleDate("2024-03")).toBe("March 2024");
  });

  it("returns year only for YYYY", () => {
    expect(formatSingleDate("2024")).toBe("2024");
  });
});
