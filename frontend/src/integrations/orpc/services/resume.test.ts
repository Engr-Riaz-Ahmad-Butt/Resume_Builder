import { ORPCError } from "@orpc/client";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

type StatisticsRow = {
  isPublic: boolean;
  views: number | null;
  downloads: number | null;
  lastViewedAt: Date | null;
  lastDownloadedAt: Date | null;
};

const where = vi.fn<() => Promise<StatisticsRow[]>>();
const rightJoin = vi.fn<() => { where: typeof where }>(() => ({ where }));
const from = vi.fn<() => { rightJoin: typeof rightJoin }>(() => ({ rightJoin }));
const select = vi.fn<() => { from: typeof from }>(() => ({ from }));

vi.mock("@/integrations/drizzle/client", () => ({
  db: {
    select,
  },
}));

const { resumeService } = await import("./resume");

describe("resumeService.statistics.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws not found when the resume does not exist for the user", async () => {
    where.mockResolvedValueOnce([]);

    try {
      await resumeService.statistics.getById({ id: "resume-1", userId: "user-1" });
      throw new Error("Expected statistics lookup to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    }
  });
});
