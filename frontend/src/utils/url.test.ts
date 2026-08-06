import { describe, expect, it } from "vite-plus/test";

import { createUrl } from "./url";

describe("createUrl", () => {
  it("returns empty strings for undefined url", () => {
    expect(createUrl()).toEqual({ url: "", label: "" });
    expect(createUrl(undefined)).toEqual({ url: "", label: "" });
  });

  it("uses url as label when label is not provided", () => {
    expect(createUrl("https://example.com")).toEqual({
      url: "https://example.com",
      label: "https://example.com",
    });
  });

  it("uses provided label", () => {
    expect(createUrl("https://example.com", "Example")).toEqual({
      url: "https://example.com",
      label: "Example",
    });
  });
});
