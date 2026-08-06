import { describe, expect, it } from "vitest";

import { app } from "../app.js";
import { REQUEST_ID_HEADER } from "../lib/request-id.js";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const body = (await res.json()) as {
      status: string;
      service: string;
      requestId: string;
    };

    expect(body.status).toBe("ok");
    expect(body.service).toBe("reactive-resume-backend");
    expect(body.requestId).toBe(res.headers.get(REQUEST_ID_HEADER));
  });

  it("propagates an incoming x-request-id", async () => {
    const res = await app.request("/api/health", {
      headers: { [REQUEST_ID_HEADER]: "test-request-id-123" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("test-request-id-123");
  });
});
