import { describe, expect, it } from "vite-plus/test";

import { isReservedPathRequest } from "./server";

describe("isReservedPathRequest", () => {
  it("detects asset requests that should not be handled as public resumes", () => {
    expect(isReservedPathRequest(new Request("https://example.com/assets/index-BNEstQDj.js"))).toBe(true);
    expect(isReservedPathRequest(new Request("https://example.com/assets/_slug-BJEV_y42.js"))).toBe(true);
  });

  it("allows public resume routes", () => {
    expect(isReservedPathRequest(new Request("https://example.com/amruthpillai/reactive-resume"))).toBe(false);
  });
});
