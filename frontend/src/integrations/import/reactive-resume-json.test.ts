import { describe, expect, it } from "vite-plus/test";

import { defaultResumeData, resumeDataSchema } from "@/schema/resume/data";

import { ReactiveResumeJSONImporter } from "./reactive-resume-json";

const importer = new ReactiveResumeJSONImporter();

describe("ReactiveResumeJSONImporter", () => {
  it("parses valid ResumeData JSON", () => {
    const result = importer.parse(JSON.stringify(defaultResumeData));
    expect(resumeDataSchema.safeParse(result).success).toBe(true);
  });

  it("throws on invalid JSON", () => {
    expect(() => importer.parse("not json")).toThrow();
  });

  it("throws on data that doesn't match schema", () => {
    expect(() => importer.parse(JSON.stringify({ invalid: true }))).toThrow();
  });

  it("normalizes missing layout sections", () => {
    const data = {
      ...defaultResumeData,
      metadata: {
        ...defaultResumeData.metadata,
        layout: {
          ...defaultResumeData.metadata.layout,
          pages: [{ fullWidth: false, main: ["experience"], sidebar: [] }],
        },
      },
    };
    const result = importer.parse(JSON.stringify(data));
    // Should add missing built-in section IDs to main
    const allSectionIds = result.metadata.layout.pages.flatMap((p) => [...p.main, ...p.sidebar]);
    expect(allSectionIds).toContain("experience");
    expect(allSectionIds).toContain("education");
    expect(allSectionIds).toContain("skills");
  });

  it("handles empty layout pages by creating default page", () => {
    const data = {
      ...defaultResumeData,
      metadata: {
        ...defaultResumeData.metadata,
        layout: {
          ...defaultResumeData.metadata.layout,
          pages: [],
        },
      },
    };
    const result = importer.parse(JSON.stringify(data));
    expect(result.metadata.layout.pages).toHaveLength(1);
    expect(result.metadata.layout.pages[0].main.length).toBeGreaterThan(0);
  });

  it("preserves complete layout without modification", () => {
    const result = importer.parse(JSON.stringify(defaultResumeData));
    expect(result.metadata.layout).toEqual(defaultResumeData.metadata.layout);
  });
});
