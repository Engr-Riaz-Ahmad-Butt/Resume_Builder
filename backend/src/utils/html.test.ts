import { describe, expect, it } from "vitest";

import { arrayToHtmlList, toHtmlDescription } from "./html";

describe("toHtmlDescription", () => {
  it("returns empty string when both are missing", () => {
    expect(toHtmlDescription()).toBe("");
    expect(toHtmlDescription(undefined, undefined)).toBe("");
  });

  it("wraps summary in <p>", () => {
    expect(toHtmlDescription("Hello")).toBe("<p>Hello</p>");
  });

  it("creates <ul> from highlights", () => {
    expect(toHtmlDescription(undefined, ["a", "b"])).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  it("combines summary and highlights", () => {
    expect(toHtmlDescription("Summary", ["a", "b"])).toBe(
      "<p>Summary</p><ul><li>a</li><li>b</li></ul>",
    );
  });

  it("ignores empty highlights array", () => {
    expect(toHtmlDescription("Summary", [])).toBe("<p>Summary</p>");
  });
});

describe("arrayToHtmlList", () => {
  it("returns empty string for empty array", () => {
    expect(arrayToHtmlList([])).toBe("");
  });

  it("creates <ul> list from items", () => {
    expect(arrayToHtmlList(["a", "b", "c"])).toBe("<ul><li>a</li><li>b</li><li>c</li></ul>");
  });

  it("handles single item", () => {
    expect(arrayToHtmlList(["only"])).toBe("<ul><li>only</li></ul>");
  });
});
