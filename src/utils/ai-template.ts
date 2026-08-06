import { defaultResumeData } from "@/schema/resume/data";

/**
 * Generates an AI extraction template item for a section by creating an object
 * with the same keys as the section's default items but with zeroed/empty values.
 * This template tells the AI what fields to extract for each section type.
 */
function makeEmptyItem(shape: Record<string, unknown>): Record<string, unknown> {
  const item: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(shape)) {
    if (typeof value === "string") item[key] = "";
    else if (typeof value === "number") item[key] = 0;
    else if (typeof value === "boolean") item[key] = false;
    else if (Array.isArray(value)) item[key] = [];
    else if (value !== null && typeof value === "object") {
      item[key] = makeEmptyItem(value as Record<string, unknown>);
    } else {
      item[key] = "";
    }
  }

  return item;
}

/**
 * Section item shape definitions. Each describes the fields the AI should extract.
 * These are the canonical shapes — if a schema field is added, add it here too.
 */
const SECTION_ITEM_SHAPES: Record<string, Record<string, unknown>> = {
  profiles: { id: "", hidden: false, icon: "", network: "", username: "", website: { url: "", label: "" } },
  experience: {
    id: "",
    hidden: false,
    company: "",
    position: "",
    location: "",
    period: "",
    website: { url: "", label: "" },
    description: "",
  },
  education: {
    id: "",
    hidden: false,
    school: "",
    degree: "",
    area: "",
    grade: "",
    location: "",
    period: "",
    website: { url: "", label: "" },
    description: "",
  },
  projects: { id: "", hidden: false, name: "", period: "", website: { url: "", label: "" }, description: "" },
  skills: { id: "", hidden: false, icon: "", name: "", proficiency: "", level: 0, keywords: [] },
  languages: { id: "", hidden: false, language: "", fluency: "", level: 0 },
  interests: { id: "", hidden: false, icon: "", name: "", keywords: [] },
  awards: {
    id: "",
    hidden: false,
    title: "",
    awarder: "",
    date: "",
    website: { url: "", label: "" },
    description: "",
  },
  certifications: {
    id: "",
    hidden: false,
    title: "",
    issuer: "",
    date: "",
    website: { url: "", label: "" },
    description: "",
  },
  publications: {
    id: "",
    hidden: false,
    title: "",
    publisher: "",
    date: "",
    website: { url: "", label: "" },
    description: "",
  },
  volunteer: {
    id: "",
    hidden: false,
    organization: "",
    location: "",
    period: "",
    website: { url: "", label: "" },
    description: "",
  },
  references: {
    id: "",
    hidden: false,
    name: "",
    position: "",
    website: { url: "", label: "" },
    phone: "",
    description: "",
  },
};

/**
 * Builds the AI extraction template programmatically from defaultResumeData.
 * This eliminates manual duplication and ensures the template stays in sync with the schema.
 */
export function buildAiExtractionTemplate() {
  const sections: Record<string, unknown> = {};

  for (const [key, shape] of Object.entries(SECTION_ITEM_SHAPES)) {
    const sectionKey = key as keyof typeof defaultResumeData.sections;
    sections[key] = {
      ...defaultResumeData.sections[sectionKey],
      items: [makeEmptyItem(shape)],
    };
  }

  return {
    ...defaultResumeData,
    basics: {
      ...defaultResumeData.basics,
      customFields: [{ id: "", icon: "", text: "", link: "" }],
    },
    sections: {
      ...defaultResumeData.sections,
      ...sections,
    },
  };
}
