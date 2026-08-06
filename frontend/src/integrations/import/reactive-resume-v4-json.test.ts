import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { SectionItem } from "@/schema/resume/data";

import { resumeDataSchema } from "@/schema/resume/data";

import { ReactiveResumeV4JSONImporter } from "./reactive-resume-v4-json";

// Mock generateId for deterministic output
let idCounter = 0;
vi.mock("@/utils/string", () => ({
  generateId: () => `mock-id-${++idCounter}`,
  slugify: (str: string) => str.toLowerCase().replace(/\s+/g, "-"),
  getInitials: (str: string) =>
    str
      .split(" ")
      .map((s) => s[0])
      .join(""),
  toUsername: (str: string) => str.toLowerCase().replace(/\s+/g, ""),
  stripHtml: (str: string) => str.replace(/<[^>]*>/g, ""),
}));

beforeEach(() => {
  idCounter = 0;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const importer = new ReactiveResumeV4JSONImporter();

function makeMinimalV4Resume(overrides?: Record<string, unknown>) {
  return {
    basics: {
      name: "Jane Doe",
      headline: "Developer",
      email: "jane@example.com",
      phone: "+1234567890",
      location: "New York, NY",
      url: { label: "Website", href: "https://jane.dev" },
      customFields: [],
      picture: {
        url: "https://example.com/photo.jpg",
        size: 80,
        aspectRatio: 1,
        borderRadius: 10,
        effects: { hidden: false, border: true, grayscale: false },
      },
    },
    sections: {
      summary: {
        name: "Summary",
        columns: 1,
        separateLinks: false,
        visible: true,
        id: "summary",
        content: "<p>A developer</p>",
      },
      awards: { name: "Awards", columns: 1, separateLinks: false, visible: true, id: "awards", items: [] },
      certifications: {
        name: "Certifications",
        columns: 1,
        separateLinks: false,
        visible: true,
        id: "certifications",
        items: [],
      },
      education: { name: "Education", columns: 1, separateLinks: false, visible: true, id: "education", items: [] },
      experience: { name: "Experience", columns: 1, separateLinks: false, visible: true, id: "experience", items: [] },
      volunteer: { name: "Volunteer", columns: 1, separateLinks: false, visible: true, id: "volunteer", items: [] },
      interests: { name: "Interests", columns: 1, separateLinks: false, visible: true, id: "interests", items: [] },
      languages: { name: "Languages", columns: 1, separateLinks: false, visible: true, id: "languages", items: [] },
      profiles: { name: "Profiles", columns: 1, separateLinks: false, visible: true, id: "profiles", items: [] },
      projects: { name: "Projects", columns: 1, separateLinks: false, visible: true, id: "projects", items: [] },
      publications: {
        name: "Publications",
        columns: 1,
        separateLinks: false,
        visible: true,
        id: "publications",
        items: [],
      },
      references: { name: "References", columns: 1, separateLinks: false, visible: true, id: "references", items: [] },
      skills: { name: "Skills", columns: 1, separateLinks: false, visible: true, id: "skills", items: [] },
    },
    metadata: {
      template: "onyx",
      layout: [
        [
          ["experience", "education"],
          ["skills", "languages"],
        ],
      ],
      css: { value: "", visible: false },
      page: { margin: 14, format: "a4" as const, options: { breakLine: true, pageNumbers: true } },
      theme: { background: "#ffffff", text: "#000000", primary: "#dc2626" },
      typography: {
        font: { family: "IBM Plex Serif", subset: "latin", variants: ["regular"], size: 14.67 },
        lineHeight: 1.5,
        hideIcons: false,
        underlineLinks: true,
      },
      notes: "",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Basic parsing
// ---------------------------------------------------------------------------

describe("ReactiveResumeV4JSONImporter", () => {
  describe("basic parsing", () => {
    it("parses a minimal V4 resume and produces valid ResumeData", () => {
      const result = importer.parse(JSON.stringify(makeMinimalV4Resume()));
      expect(resumeDataSchema.safeParse(result).success).toBe(true);
    });

    it("maps basics fields correctly", () => {
      const result = importer.parse(JSON.stringify(makeMinimalV4Resume()));
      expect(result.basics.name).toBe("Jane Doe");
      expect(result.basics.headline).toBe("Developer");
      expect(result.basics.email).toBe("jane@example.com");
      expect(result.basics.phone).toBe("+1234567890");
      expect(result.basics.location).toBe("New York, NY");
      expect(result.basics.website.url).toBe("https://jane.dev");
      expect(result.basics.website.label).toBe("Website");
    });

    it("maps picture fields correctly", () => {
      const result = importer.parse(JSON.stringify(makeMinimalV4Resume()));
      expect(result.picture.url).toBe("https://example.com/photo.jpg");
      expect(result.picture.size).toBe(80);
      expect(result.picture.aspectRatio).toBe(1);
      expect(result.picture.borderRadius).toBe(10);
      expect(result.picture.hidden).toBe(false);
      expect(result.picture.borderWidth).toBe(1); // border effect was true
    });

    it("maps summary correctly", () => {
      const result = importer.parse(JSON.stringify(makeMinimalV4Resume()));
      expect(result.summary.title).toBe("Summary");
      expect(result.summary.content).toBe("<p>A developer</p>");
      expect(result.summary.hidden).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Section items
  // ---------------------------------------------------------------------------

  describe("section items", () => {
    it("transforms experience items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).experience.items = [
        {
          id: "exp-1",
          visible: true,
          company: "Acme Corp",
          position: "Engineer",
          location: "NYC",
          date: "2020 - 2022",
          summary: "<p>Built things</p>",
          url: { label: "Acme", href: "https://acme.com" },
        },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.experience.items).toHaveLength(1);
      const exp = result.sections.experience.items[0];
      expect(exp.company).toBe("Acme Corp");
      expect(exp.position).toBe("Engineer");
      expect(exp.location).toBe("NYC");
      expect(exp.period).toBe("2020 - 2022");
      expect(exp.description).toBe("<p>Built things</p>");
      expect(exp.website.url).toBe("https://acme.com");
    });

    it("transforms education items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).education.items = [
        {
          id: "edu-1",
          visible: true,
          institution: "MIT",
          studyType: "BSc",
          area: "Computer Science",
          score: "4.0",
          date: "2016 - 2020",
          summary: "<p>Graduated</p>",
          url: { label: "MIT", href: "https://mit.edu" },
        },
      ];

      const result = importer.parse(JSON.stringify(v4));
      const edu = result.sections.education.items[0];
      expect(edu.school).toBe("MIT");
      expect(edu.degree).toBe("BSc");
      expect(edu.area).toBe("Computer Science");
      expect(edu.grade).toBe("4.0");
      expect(edu.period).toBe("2016 - 2020");
    });

    it("transforms skill items with level clamping", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).skills.items = [
        { id: "s1", visible: true, name: "TypeScript", description: "Advanced", level: 4, keywords: ["frontend"] },
        { id: "s2", visible: true, name: "Rust", description: "Beginner", level: 10, keywords: [] }, // level > 5
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.skills.items).toHaveLength(2);
      expect(result.sections.skills.items[0].name).toBe("TypeScript");
      expect(result.sections.skills.items[0].proficiency).toBe("Advanced");
      expect(result.sections.skills.items[0].level).toBe(4);
      expect(result.sections.skills.items[1].level).toBe(5); // clamped to 5
    });

    it("transforms language items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).languages.items = [
        { id: "l1", visible: true, name: "English", description: "Native", level: 5 },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.languages.items[0].language).toBe("English");
      expect(result.sections.languages.items[0].fluency).toBe("Native");
    });

    it("transforms profile items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).profiles.items = [
        {
          id: "p1",
          visible: true,
          network: "GitHub",
          username: "janedoe",
          icon: "github",
          url: { label: "GitHub", href: "https://github.com/janedoe" },
        },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.profiles.items[0].network).toBe("GitHub");
      expect(result.sections.profiles.items[0].username).toBe("janedoe");
      expect(result.sections.profiles.items[0].icon).toBe("github");
    });

    it("transforms award items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).awards.items = [
        {
          id: "a1",
          visible: true,
          title: "Best Developer",
          awarder: "Company",
          date: "2023",
          summary: "<p>Won it</p>",
        },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.awards.items[0].title).toBe("Best Developer");
      expect(result.sections.awards.items[0].awarder).toBe("Company");
    });

    it("transforms certification items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).certifications.items = [
        { id: "c1", visible: true, name: "AWS Certified", issuer: "AWS", date: "2023" },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.certifications.items[0].title).toBe("AWS Certified");
      expect(result.sections.certifications.items[0].issuer).toBe("AWS");
    });

    it("transforms publication items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).publications.items = [
        { id: "pub1", visible: true, name: "My Paper", publisher: "IEEE", date: "2024", summary: "<p>Research</p>" },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.publications.items[0].title).toBe("My Paper");
      expect(result.sections.publications.items[0].publisher).toBe("IEEE");
    });

    it("transforms volunteer items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).volunteer.items = [
        {
          id: "v1",
          visible: true,
          organization: "Red Cross",
          position: "Helper",
          location: "NYC",
          date: "2023",
          summary: "<p>Helped</p>",
        },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.volunteer.items[0].organization).toBe("Red Cross");
      expect(result.sections.volunteer.items[0].location).toBe("NYC");
    });

    it("transforms reference items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).references.items = [
        { id: "r1", visible: true, name: "John Manager", description: "CTO", summary: "<p>Great developer</p>" },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.references.items[0].name).toBe("John Manager");
      expect(result.sections.references.items[0].position).toBe("CTO");
      expect(result.sections.references.items[0].description).toBe("<p>Great developer</p>");
    });

    it("transforms interest items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).interests.items = [
        { id: "i1", visible: true, name: "Gaming", keywords: ["RPG", "Strategy"] },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.interests.items[0].name).toBe("Gaming");
      expect(result.sections.interests.items[0].keywords).toEqual(["RPG", "Strategy"]);
    });

    it("transforms project items using summary over description", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).projects.items = [
        {
          id: "proj1",
          visible: true,
          name: "My App",
          description: "desc",
          date: "2024",
          summary: "<p>summary</p>",
          url: { label: "", href: "" },
        },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.projects.items[0].description).toBe("<p>summary</p>");
    });

    it("falls back to description when summary is missing for projects", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).projects.items = [
        { id: "proj1", visible: true, name: "My App", description: "desc text", date: "2024" },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.projects.items[0].description).toBe("desc text");
    });
  });

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  describe("filtering", () => {
    it("filters out items with empty required fields", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).experience.items = [
        { id: "e1", visible: true, company: "Acme", position: "Dev" },
        { id: "e2", visible: true, company: "", position: "Dev" }, // empty company
        { id: "e3", visible: true, position: "Dev" }, // missing company
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.experience.items).toHaveLength(1);
      expect(result.sections.experience.items[0].company).toBe("Acme");
    });

    it("filters out profiles without network name", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).profiles.items = [
        { id: "p1", visible: true, network: "GitHub", username: "jane" },
        { id: "p2", visible: true, network: "", username: "jane" },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.profiles.items).toHaveLength(1);
    });

    it("filters out skills without name", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).skills.items = [
        { id: "s1", visible: true, name: "TypeScript" },
        { id: "s2", visible: true, name: "" },
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.skills.items).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Visibility mapping
  // ---------------------------------------------------------------------------

  describe("visibility mapping", () => {
    it("maps visible: false to hidden: true", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).experience.items = [{ id: "e1", visible: false, company: "Acme", position: "Dev" }];
      (v4.sections as any).experience.visible = false;

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.experience.hidden).toBe(true);
      expect(result.sections.experience.items[0].hidden).toBe(true);
    });

    it("maps visible: true to hidden: false", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).awards.visible = true;

      const result = importer.parse(JSON.stringify(v4));
      expect(result.sections.awards.hidden).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------

  describe("metadata", () => {
    it("maps theme colors to rgba format", () => {
      const result = importer.parse(JSON.stringify(makeMinimalV4Resume()));
      expect(result.metadata.design.colors.primary).toMatch(/^rgba\(/);
      expect(result.metadata.design.colors.text).toMatch(/^rgba\(/);
      expect(result.metadata.design.colors.background).toMatch(/^rgba\(/);
    });

    it("maps CSS settings", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.css = { value: "body { color: red; }", visible: true };

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.css.enabled).toBe(true);
      expect(result.metadata.css.value).toBe("body { color: red; }");
    });

    it("maps page format", () => {
      const v4 = makeMinimalV4Resume();
      (v4.metadata.page.format as "a4" | "letter") = "letter";

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.page.format).toBe("letter");
    });

    it("maps font family and font size (px to pt conversion)", () => {
      const result = importer.parse(JSON.stringify(makeMinimalV4Resume()));
      expect(result.metadata.typography.body.fontFamily).toBe("IBM Plex Serif");
      // 14.67px * 0.75 = 11.0025pt
      expect(result.metadata.typography.body.fontSize).toBeCloseTo(11, 0);
    });

    it("maps hideIcons setting", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.typography.hideIcons = true;

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.page.hideIcons).toBe(true);
    });

    it("defaults to onyx template for invalid template names", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.template = "nonexistent-template";

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.template).toBe("onyx");
    });

    it("preserves valid template names", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.template = "pikachu";

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.template).toBe("pikachu");
    });

    it("maps notes", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.notes = "Some notes here";

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.notes).toBe("Some notes here");
    });
  });

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  describe("layout", () => {
    it("converts V4 layout pages to new format", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.layout = [
        [["experience", "education"], ["skills"]],
        [["projects"], []],
      ];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.layout.pages).toHaveLength(2);
      expect(result.metadata.layout.pages[0].main).toContain("experience");
      expect(result.metadata.layout.pages[0].sidebar).toContain("skills");
      expect(result.metadata.layout.pages[1].main).toContain("projects");
      expect(result.metadata.layout.pages[1].fullWidth).toBe(true); // empty sidebar
    });

    it("strips 'custom.' prefix from layout section IDs", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.layout = [[["experience", "custom.abc123"], ["skills"]]];
      (v4.sections as any).custom = {
        abc123: {
          name: "Custom Section",
          columns: 1,
          separateLinks: false,
          visible: true,
          id: "abc123",
          items: [],
        },
      };

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.layout.pages[0].main).toContain("abc123");
      expect(result.metadata.layout.pages[0].main).not.toContain("custom.abc123");
    });

    it("removes summary from layout columns (handled separately)", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.layout = [[["summary", "experience"], ["skills"]]];

      const result = importer.parse(JSON.stringify(v4));
      // Summary should be re-added at the front when visible
      const mainSections = result.metadata.layout.pages[0].main;
      expect(mainSections[0]).toBe("summary");
      expect(mainSections.filter((s) => s === "summary")).toHaveLength(1);
    });

    it("adds summary to front of first page when visible with content", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.layout = [[["experience"], ["skills"]]];
      (v4.sections as any).summary.visible = true;
      (v4.sections as any).summary.content = "<p>Summary text</p>";

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.layout.pages[0].main[0]).toBe("summary");
    });

    it("does NOT add summary to layout when it is not visible", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.layout = [[["experience"], ["skills"]]];
      (v4.sections as any).summary.visible = false;
      (v4.sections as any).summary.content = "<p>Summary text</p>";

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.layout.pages[0].main).not.toContain("summary");
    });
  });

  // ---------------------------------------------------------------------------
  // Custom sections
  // ---------------------------------------------------------------------------

  describe("custom sections", () => {
    it("transforms custom sections to experience-typed custom sections", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).custom = {
        "custom-1": {
          name: "Freelance Work",
          columns: 2,
          separateLinks: false,
          visible: true,
          id: "custom-1",
          items: [
            {
              id: "ci1",
              visible: true,
              name: "Project A",
              description: "Lead Dev",
              date: "2023",
              location: "Remote",
              summary: "<p>Details</p>",
            },
          ],
        },
      };

      const result = importer.parse(JSON.stringify(v4));
      const section = result.customSections[0];
      const item = section.items[0] as SectionItem<"experience">;

      expect(result.customSections).toHaveLength(1);
      expect(section.title).toBe("Freelance Work");
      expect(section.type).toBe("experience");
      expect(section.columns).toBe(2);
      expect(section.items).toHaveLength(1);
      expect(item.company).toBe("Project A");
      expect(item.position).toBe("Lead Dev");
    });

    it("handles custom section items without name by using index", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).custom = {
        "custom-1": {
          name: "Other",
          columns: 1,
          separateLinks: false,
          visible: true,
          id: "custom-1",
          items: [{ id: "ci1", visible: true, description: "Something" }],
        },
      };

      const result = importer.parse(JSON.stringify(v4));
      const section = result.customSections[0];
      const item = section.items[0] as SectionItem<"experience">;

      expect(item.company).toBe("#1");
    });

    it("filters out invisible custom section items", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).custom = {
        "custom-1": {
          name: "Section",
          columns: 1,
          separateLinks: false,
          visible: true,
          id: "custom-1",
          items: [
            { id: "ci1", visible: true, name: "Visible" },
            { id: "ci2", visible: false, name: "Hidden" },
          ],
        },
      };

      const result = importer.parse(JSON.stringify(v4));
      expect(result.customSections[0].items).toHaveLength(1);
    });

    it("handles empty custom sections object", () => {
      const v4 = makeMinimalV4Resume();
      (v4.sections as any).custom = {};

      const result = importer.parse(JSON.stringify(v4));
      expect(result.customSections).toHaveLength(0);
    });

    it("handles missing custom sections", () => {
      const v4 = makeMinimalV4Resume();
      delete (v4.sections as any).custom;

      const result = importer.parse(JSON.stringify(v4));
      expect(result.customSections).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("sanitizes invalid email addresses", () => {
      const v4 = makeMinimalV4Resume();
      v4.basics.email = "not-an-email";

      const result = importer.parse(JSON.stringify(v4));
      expect(result.basics.email).toBe("");
    });

    it("preserves valid email addresses", () => {
      const v4 = makeMinimalV4Resume();
      v4.basics.email = "valid@example.com";

      const result = importer.parse(JSON.stringify(v4));
      expect(result.basics.email).toBe("valid@example.com");
    });

    it("handles missing optional fields with defaults", () => {
      const v4 = makeMinimalV4Resume();
      v4.basics.phone = "";
      v4.basics.location = "";
      v4.basics.url = { label: "", href: "" };

      const result = importer.parse(JSON.stringify(v4));
      expect(result.basics.phone).toBe("");
      expect(result.basics.location).toBe("");
      expect(result.basics.website.url).toBe("");
    });

    it("handles missing picture data", () => {
      const v4 = makeMinimalV4Resume();
      (v4.basics as any).picture = undefined;

      const result = importer.parse(JSON.stringify(v4));
      expect(result.picture.url).toBe("");
      expect(result.picture.size).toBe(80);
    });

    it("clamps picture size to valid range", () => {
      const v4 = makeMinimalV4Resume();
      v4.basics.picture.size = 1000;

      const result = importer.parse(JSON.stringify(v4));
      expect(result.picture.size).toBe(512);
    });

    it("clamps picture size minimum", () => {
      const v4 = makeMinimalV4Resume();
      v4.basics.picture.size = 5;

      const result = importer.parse(JSON.stringify(v4));
      expect(result.picture.size).toBe(32);
    });

    it("clamps aspect ratio to valid range", () => {
      const v4 = makeMinimalV4Resume();
      v4.basics.picture.aspectRatio = 10;

      const result = importer.parse(JSON.stringify(v4));
      expect(result.picture.aspectRatio).toBe(2.5);
    });

    it("converts font variants correctly", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.typography.font.variants = ["regular", "bold", "700"];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.typography.body.fontWeights).toContain("400");
      expect(result.metadata.typography.body.fontWeights).toContain("700");
    });

    it("heading font weights are >= 600", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.typography.font.variants = ["regular", "300"];

      const result = importer.parse(JSON.stringify(v4));
      // All heading weights should be >= 600; defaults to ["600"] if none qualify
      for (const weight of result.metadata.typography.heading.fontWeights) {
        expect(Number.parseInt(weight, 10)).toBeGreaterThanOrEqual(600);
      }
    });

    it("handles custom fields in basics", () => {
      const v4 = makeMinimalV4Resume();
      (v4.basics.customFields as any) = [{ id: "cf1", icon: "star", text: "Custom field value" }];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.basics.customFields).toHaveLength(1);
      expect(result.basics.customFields[0].text).toBe("Custom field value");
      expect(result.basics.customFields[0].icon).toBe("star");
    });

    it("throws on invalid JSON", () => {
      expect(() => importer.parse("not json")).toThrow();
    });

    it("produces a result that validates against resumeDataSchema", () => {
      const v4 = makeMinimalV4Resume();
      // Add items to every section
      (v4.sections as any).experience.items = [{ id: "e1", visible: true, company: "Co", position: "Dev" }];
      (v4.sections as any).education.items = [{ id: "ed1", visible: true, institution: "Uni", studyType: "BSc" }];
      (v4.sections as any).skills.items = [{ id: "s1", visible: true, name: "JS", level: 3 }];
      (v4.sections as any).languages.items = [{ id: "l1", visible: true, name: "English", level: 5 }];

      const result = importer.parse(JSON.stringify(v4));
      const validation = resumeDataSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Font weight conversion
  // ---------------------------------------------------------------------------

  describe("font weight conversion", () => {
    it("maps 'bold' to 700", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.typography.font.variants = ["bold"];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.typography.body.fontWeights).toContain("700");
    });

    it("maps 'italic' to 400", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.typography.font.variants = ["italic"];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.typography.body.fontWeights).toContain("400");
    });

    it("defaults to 400 for empty variants", () => {
      const v4 = makeMinimalV4Resume();
      v4.metadata.typography.font.variants = [];

      const result = importer.parse(JSON.stringify(v4));
      expect(result.metadata.typography.body.fontWeights).toEqual(["400"]);
    });
  });
});
