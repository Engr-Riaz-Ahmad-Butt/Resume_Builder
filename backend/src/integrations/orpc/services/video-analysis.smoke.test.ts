import { describe, expect, it } from "vitest";

import { videoAnalysisService } from "./video-analysis";

describe("videoAnalysisService smoke", () => {
  it("exports expected operations", () => {
    expect(typeof videoAnalysisService.getLatest).toBe("function");
    expect(typeof videoAnalysisService.getById).toBe("function");
    expect(typeof videoAnalysisService.listForUser).toBe("function");
    expect(typeof videoAnalysisService.uploadAndAnalyzeVideo).toBe("function");
  });
});
