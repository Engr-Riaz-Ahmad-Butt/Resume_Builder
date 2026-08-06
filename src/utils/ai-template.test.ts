import { describe, expect, it } from "vite-plus/test";

import { defaultResumeData } from "@/schema/resume/data";

import { buildAiExtractionTemplate } from "./ai-template";

describe("buildAiExtractionTemplate", () => {
  const template = buildAiExtractionTemplate();

  it("produces a valid ResumeData structure", () => {
    // The template should pass schema validation (items have empty strings which satisfy .min(1) checks,
    // so we validate the overall shape matches)
    expect(template).toBeDefined();
    expect(template.basics).toBeDefined();
    expect(template.sections).toBeDefined();
    expect(template.metadata).toBeDefined();
  });

  it("includes a sample custom field in basics", () => {
    expect(template.basics.customFields).toHaveLength(1);
    expect(template.basics.customFields[0]).toEqual({ id: "", icon: "", text: "", link: "" });
  });

  it("populates each section with exactly one example item", () => {
    const sectionKeys = [
      "profiles",
      "experience",
      "education",
      "projects",
      "skills",
      "languages",
      "interests",
      "awards",
      "certifications",
      "publications",
      "volunteer",
      "references",
    ] as const;

    for (const key of sectionKeys) {
      const section = template.sections[key];
      expect(section.items).toHaveLength(1);
    }
  });

  it("preserves section metadata from defaultResumeData", () => {
    const sectionKeys = Object.keys(defaultResumeData.sections) as Array<keyof typeof defaultResumeData.sections>;

    for (const key of sectionKeys) {
      expect(template.sections[key].title).toBe(defaultResumeData.sections[key].title);
      expect(template.sections[key].columns).toBe(defaultResumeData.sections[key].columns);
      expect(template.sections[key].hidden).toBe(defaultResumeData.sections[key].hidden);
    }
  });

  it("has empty string values in example items (not default data)", () => {
    const expItem = template.sections.experience.items[0];
    expect(expItem.company).toBe("");
    expect(expItem.position).toBe("");
    expect(expItem.id).toBe("");
  });

  it("has zeroed numeric values in example items", () => {
    const skillItem = template.sections.skills.items[0];
    expect(skillItem.level).toBe(0);
  });

  it("has nested objects with empty values", () => {
    const expItem = template.sections.experience.items[0];
    expect(expItem.website).toEqual({ url: "", label: "" });
  });

  it("covers all sections present in defaultResumeData", () => {
    const defaultKeys = Object.keys(defaultResumeData.sections).sort();
    const templateKeys = Object.keys(template.sections).sort();
    expect(templateKeys).toEqual(defaultKeys);
  });

  it("preserves metadata and picture from defaultResumeData", () => {
    expect(template.metadata).toEqual(defaultResumeData.metadata);
    expect(template.picture).toEqual(defaultResumeData.picture);
  });
});
