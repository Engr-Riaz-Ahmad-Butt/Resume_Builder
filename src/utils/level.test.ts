import { describe, expect, it } from "vite-plus/test";

import { parseLevel } from "./level";

describe("parseLevel", () => {
  it("returns 0 for undefined/empty", () => {
    expect(parseLevel()).toBe(0);
    expect(parseLevel(undefined)).toBe(0);
    expect(parseLevel("")).toBe(0);
  });

  it("parses numeric values within range", () => {
    expect(parseLevel("0")).toBe(0);
    expect(parseLevel("3")).toBe(3);
    expect(parseLevel("5")).toBe(5);
  });

  it("returns 0 for numeric values out of range", () => {
    expect(parseLevel("6")).toBe(0);
    expect(parseLevel("-1")).toBe(0);
  });

  it("maps expert-level text to 5", () => {
    expect(parseLevel("Native")).toBe(5);
    expect(parseLevel("Expert")).toBe(5);
    expect(parseLevel("Master")).toBe(5);
  });

  it("maps advanced-level text to 4", () => {
    expect(parseLevel("Fluent")).toBe(4);
    expect(parseLevel("Advanced")).toBe(4);
    expect(parseLevel("Proficient")).toBe(4);
  });

  it("maps intermediate-level text to 3", () => {
    expect(parseLevel("Intermediate")).toBe(3);
    expect(parseLevel("Conversational")).toBe(3);
  });

  it("maps beginner-level text to 2", () => {
    expect(parseLevel("Beginner")).toBe(2);
    expect(parseLevel("Basic")).toBe(2);
    expect(parseLevel("Elementary")).toBe(2);
  });

  it("maps novice to 1", () => {
    expect(parseLevel("Novice")).toBe(1);
  });

  it("maps CEFR levels correctly", () => {
    expect(parseLevel("C2")).toBe(5);
    expect(parseLevel("C1")).toBe(4);
    expect(parseLevel("B2")).toBe(3);
    expect(parseLevel("B1")).toBe(2);
    expect(parseLevel("A2")).toBe(1);
    expect(parseLevel("A1")).toBe(1);
  });

  it("is case-insensitive", () => {
    expect(parseLevel("NATIVE")).toBe(5);
    expect(parseLevel("beginner")).toBe(2);
    expect(parseLevel("c2")).toBe(5);
  });

  it("matches partial strings", () => {
    expect(parseLevel("Native speaker")).toBe(5);
    expect(parseLevel("Advanced level")).toBe(4);
  });

  it("returns 0 for unrecognized text", () => {
    expect(parseLevel("unknown")).toBe(0);
    expect(parseLevel("xyz")).toBe(0);
  });
});
