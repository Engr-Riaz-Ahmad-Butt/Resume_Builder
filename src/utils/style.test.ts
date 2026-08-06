import { describe, expect, it } from "vite-plus/test";

import { cn } from "./style";

describe("cn", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes (falsy values ignored)", () => {
    const falsyValue = false;
    expect(cn("base", falsyValue && "hidden", "active")).toBe("base active");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("merges Tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("merges conflicting Tailwind utilities", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("keeps non-conflicting Tailwind classes", () => {
    const result = cn("p-4", "m-2", "text-red-500");
    expect(result).toContain("p-4");
    expect(result).toContain("m-2");
    expect(result).toContain("text-red-500");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles array input", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object input", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });
});
