import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeRedis } from "@/lib/redis";
import { aiService } from "@/integrations/orpc/services/ai";
import { jobsService } from "@/integrations/orpc/services/jobs";
import type { JobResult } from "@/schema/jobs";
import { resetDb } from "@/test/reset-db";
import { resetRedis } from "@/test/reset-redis";

const baseJob = (overrides: Partial<JobResult>): JobResult =>
  ({
    job_id: "1",
    job_title: "Engineer",
    employer_name: "Acme",
    job_city: "Remote",
    job_description: "Build things",
    job_apply_is_direct: false,
    job_min_salary: null,
    job_max_salary: null,
    ...overrides,
  }) as JobResult;

describe("ai + jobs smoke", () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await closeRedis();
  });

  it("aiService exports expected operations", () => {
    expect(typeof aiService.testConnection).toBe("function");
    expect(typeof aiService.analyzeResume).toBe("function");
    expect(typeof aiService.chat).toBe("function");
    expect(typeof aiService.parseDocx).toBe("function");
    expect(typeof aiService.parsePdf).toBe("function");
    expect(typeof aiService.tailorResume).toBe("function");
  });

  it("jobsService exports expected operations", () => {
    expect(typeof jobsService.search).toBe("function");
    expect(typeof jobsService.testConnection).toBe("function");
    expect(typeof jobsService.applyPostFilters).toBe("function");
    expect(typeof jobsService.deduplicateJobs).toBe("function");
  });

  it("jobsService.deduplicateJobs removes duplicate title/company/city", () => {
    const jobs = [
      baseJob({ job_id: "1", job_title: "Engineer", employer_name: "Acme", job_city: "Remote" }),
      baseJob({ job_id: "2", job_title: "Engineer", employer_name: "Acme", job_city: "Remote" }),
      baseJob({ job_id: "3", job_title: "Designer", employer_name: "Acme", job_city: "Remote" }),
    ];
    expect(jobsService.deduplicateJobs(jobs)).toHaveLength(2);
  });
});
