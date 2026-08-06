import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@lingui/core/macro", () => ({
  msg: (strings: TemplateStringsArray) => ({ id: strings[0] }),
}));

vi.mock("@tanstack/react-start", () => {
  const chainable = () => new Proxy({}, { get: () => chainable });
  return {
    createIsomorphicFn: chainable,
    createServerFn: chainable,
  };
});

vi.mock("@tanstack/react-start/server", () => ({
  getCookie: () => undefined,
  setCookie: () => {},
}));

vi.mock("js-cookie", () => ({
  default: { get: () => undefined },
}));

import { isTheme } from "./theme";

describe("isTheme", () => {
  it("returns true for 'light'", () => {
    expect(isTheme("light")).toBe(true);
  });

  it("returns true for 'dark'", () => {
    expect(isTheme("dark")).toBe(true);
  });

  it("returns false for invalid theme strings", () => {
    expect(isTheme("auto")).toBe(false);
    expect(isTheme("system")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme("DARK")).toBe(false);
    expect(isTheme("Light")).toBe(false);
  });
});
