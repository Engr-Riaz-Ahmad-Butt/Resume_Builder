import { describe, expect, it } from "vite-plus/test";

import { parseColorString } from "./color";

describe("parseColorString", () => {
  it("should parse a 6-digit hex color", () => {
    expect(parseColorString("#ff8800")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it("should parse a 3-digit hex color", () => {
    expect(parseColorString("#f80")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it("should be case-insensitive for hex", () => {
    expect(parseColorString("#FF8800")).toEqual(parseColorString("#ff8800"));
  });

  it("should parse rgb()", () => {
    expect(parseColorString("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
  });

  it("should parse rgba() with alpha", () => {
    expect(parseColorString("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
  });

  it("should handle whitespace around the value", () => {
    expect(parseColorString("  #000000  ")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it("should return null for invalid input", () => {
    expect(parseColorString("not-a-color")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseColorString("")).toBeNull();
  });

  it("should return null for incomplete hex", () => {
    expect(parseColorString("#ff")).toBeNull();
  });

  // --- Additional branch coverage ---

  it("should parse rgba() without alpha (defaults to 1)", () => {
    expect(parseColorString("rgba(100, 200, 50)")).toEqual({ r: 100, g: 200, b: 50, a: 1 });
  });

  it("should parse rgb() with max values", () => {
    expect(parseColorString("rgb(255, 255, 255)")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it("should parse rgba() with alpha of 0", () => {
    expect(parseColorString("rgba(0, 0, 0, 0)")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("should parse rgba() with alpha of 1", () => {
    expect(parseColorString("rgba(0, 0, 0, 1)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it("should parse 3-digit hex #000", () => {
    expect(parseColorString("#000")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it("should parse 3-digit hex #fff", () => {
    expect(parseColorString("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it("should return null for 4-digit hex", () => {
    expect(parseColorString("#ffff")).toBeNull();
  });

  it("should return null for 8-digit hex (with alpha)", () => {
    expect(parseColorString("#ff880080")).toBeNull();
  });

  it("should return null for non-hex characters after #", () => {
    expect(parseColorString("#gggggg")).toBeNull();
  });

  it("should return null for named colors", () => {
    expect(parseColorString("red")).toBeNull();
    expect(parseColorString("blue")).toBeNull();
  });

  it("should handle rgb with extra spaces", () => {
    expect(parseColorString("rgb(  10 ,  20 ,  30  )")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
  });

  it("should parse rgba with decimal alpha", () => {
    expect(parseColorString("rgba(255, 0, 0, 0.75)")).toEqual({ r: 255, g: 0, b: 0, a: 0.75 });
  });
});
