import { describe, expect, it } from "vitest";

import { env } from "@/lib/env";
import { generatePrinterToken, verifyPrinterToken } from "@/utils/printer-token";

import { buildPrinterPageUrl } from "./printer";

describe("printer URL wiring (no Browserless)", () => {
  it("builds print URL against PRINTER_APP_URL (frontend) with token", () => {
    const resumeId = "11111111-1111-1111-1111-111111111111";
    const token = generatePrinterToken(resumeId);
    const url = buildPrinterPageUrl(resumeId, token);

    expect(url.startsWith(env.PRINTER_APP_URL ?? env.APP_URL)).toBe(true);
    expect(url).toContain(`/printer/${resumeId}`);
    expect(url).toContain("token=");
    expect(verifyPrinterToken(new URL(url).searchParams.get("token")!)).toBe(resumeId);
  });

  it("flags that PRINTER_APP_URL is frontend-scoped", () => {
    // FLAG: PDF capture loads the React printer page on the frontend, not the API host.
    expect(env.PRINTER_APP_URL).toBe("http://127.0.0.1:3000");
    expect(env.PRINTER_ENDPOINT).toMatch(/^wss?:\/\//);
  });
});
