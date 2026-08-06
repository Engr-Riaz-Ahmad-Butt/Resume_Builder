import { describe, expect, it } from "vite-plus/test";

import { toSafeDocxLink } from "./link-utils";

describe("toSafeDocxLink", () => {
  describe("valid URLs", () => {
    it("returns http URLs as-is", () => {
      expect(toSafeDocxLink("http://example.com")).toBe("http://example.com/");
    });

    it("returns https URLs as-is", () => {
      expect(toSafeDocxLink("https://example.com")).toBe("https://example.com/");
    });

    it("returns https URLs with paths", () => {
      expect(toSafeDocxLink("https://example.com/path/to/page")).toBe("https://example.com/path/to/page");
    });

    it("returns https URLs with query parameters", () => {
      expect(toSafeDocxLink("https://example.com?foo=bar")).toBe("https://example.com/?foo=bar");
    });

    it("returns mailto links", () => {
      expect(toSafeDocxLink("mailto:user@example.com")).toBe("mailto:user@example.com");
    });

    it("trims whitespace before processing", () => {
      expect(toSafeDocxLink("  https://example.com  ")).toBe("https://example.com/");
    });
  });

  describe("invalid/unsafe URLs", () => {
    it("returns null for empty string", () => {
      expect(toSafeDocxLink("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(toSafeDocxLink("   ")).toBeNull();
    });

    it("returns null for javascript: URLs", () => {
      expect(toSafeDocxLink("javascript:alert(1)")).toBeNull();
    });

    it("returns null for data: URLs", () => {
      expect(toSafeDocxLink("data:text/html,<h1>hi</h1>")).toBeNull();
    });

    it("returns null for file: URLs", () => {
      expect(toSafeDocxLink("file:///etc/passwd")).toBeNull();
    });

    it("returns null for ftp: URLs", () => {
      expect(toSafeDocxLink("ftp://example.com")).toBeNull();
    });

    it("returns null for invalid URLs", () => {
      expect(toSafeDocxLink("not a url at all")).toBeNull();
    });

    it("returns null for mailto: without email", () => {
      expect(toSafeDocxLink("mailto:")).toBeNull();
    });

    it("returns null for mailto: with only whitespace", () => {
      expect(toSafeDocxLink("mailto:   ")).toBeNull();
    });
  });
});
