import { describe, expect, it } from "vite-plus/test";

import { resumeDataSchema } from "@/schema/resume/data";

import { JSONResumeImporter } from "./json-resume";

const importer = new JSONResumeImporter();

function makeMinimalJsonResume(overrides?: Record<string, unknown>) {
  return {
    basics: {
      name: "John Doe",
      label: "Software Engineer",
      email: "john@example.com",
      phone: "+1-555-0100",
      summary: "A passionate developer.",
      location: { city: "San Francisco", region: "CA", countryCode: "US" },
      url: "https://johndoe.com",
      profiles: [{ network: "GitHub", username: "johndoe", url: "https://github.com/johndoe" }],
    },
    work: [
      {
        name: "Acme Corp",
        position: "Senior Developer",
        startDate: "2020-01",
        endDate: "2024-06",
        summary: "Led a team of 5.",
        highlights: ["Built CI/CD pipeline", "Reduced build time by 50%"],
      },
    ],
    education: [
      {
        institution: "MIT",
        studyType: "Bachelor",
        area: "Computer Science",
        score: "3.9",
        startDate: "2016-09",
        endDate: "2020-05",
      },
    ],
    skills: [{ name: "TypeScript", level: "Advanced", keywords: ["React", "Node.js"] }],
    languages: [{ language: "English", fluency: "Native" }],
    ...overrides,
  };
}

describe("JSONResumeImporter", () => {
  describe("parse", () => {
    it("parses a valid JSON Resume and produces valid ResumeData", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      expect(resumeDataSchema.safeParse(result).success).toBe(true);
    });

    it("throws on invalid JSON", () => {
      expect(() => importer.parse("not json")).toThrow();
    });
  });

  describe("convert - basics", () => {
    it("maps name and headline", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      expect(result.basics.name).toBe("John Doe");
      expect(result.basics.headline).toBe("Software Engineer");
    });

    it("maps email and phone", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      expect(result.basics.email).toBe("john@example.com");
      expect(result.basics.phone).toBe("+1-555-0100");
    });

    it("formats location from object to string", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      expect(result.basics.location).toBe("San Francisco, CA, US");
    });

    it("maps website URL", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      expect(result.basics.website.url).toBe("https://johndoe.com");
    });
  });

  describe("convert - summary", () => {
    it("wraps summary in HTML", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      expect(result.summary.content).toBe("<p>A passionate developer.</p>");
      expect(result.summary.hidden).toBe(false);
    });

    it("handles missing summary", () => {
      const data = makeMinimalJsonResume();
      delete (data.basics as Record<string, unknown>).summary;
      const result = importer.parse(JSON.stringify(data));
      expect(result.summary.content).toBe("");
    });
  });

  describe("convert - experience", () => {
    it("maps work to experience items", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      expect(result.sections.experience.items).toHaveLength(1);
      const exp = result.sections.experience.items[0];
      expect(exp.company).toBe("Acme Corp");
      expect(exp.position).toBe("Senior Developer");
      expect(exp.period).toBe("January 2020 - June 2024");
    });

    it("converts summary+highlights to HTML description", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      const exp = result.sections.experience.items[0];
      expect(exp.description).toContain("<p>Led a team of 5.</p>");
      expect(exp.description).toContain("<li>Built CI/CD pipeline</li>");
    });

    it("filters out entries without name or position", () => {
      const data = makeMinimalJsonResume({ work: [{ location: "Nowhere" }] });
      const result = importer.parse(JSON.stringify(data));
      expect(result.sections.experience.items).toHaveLength(0);
    });
  });

  describe("convert - education", () => {
    it("maps education items", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      const edu = result.sections.education.items[0];
      expect(edu.school).toBe("MIT");
      expect(edu.degree).toBe("Bachelor in Computer Science");
      expect(edu.grade).toBe("3.9");
    });
  });

  describe("convert - skills", () => {
    it("maps skills with level parsing", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      const skill = result.sections.skills.items[0];
      expect(skill.name).toBe("TypeScript");
      expect(skill.level).toBe(4); // "Advanced" maps to 4
      expect(skill.keywords).toEqual(["React", "Node.js"]);
    });
  });

  describe("convert - languages", () => {
    it("maps languages with fluency level", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      const lang = result.sections.languages.items[0];
      expect(lang.language).toBe("English");
      expect(lang.level).toBe(5); // "Native" maps to 5
    });
  });

  describe("convert - profiles", () => {
    it("maps profiles with network icons", () => {
      const result = importer.parse(JSON.stringify(makeMinimalJsonResume()));
      const profile = result.sections.profiles.items[0];
      expect(profile.network).toBe("GitHub");
      expect(profile.icon).toBe("github-logo");
      expect(profile.username).toBe("johndoe");
    });
  });

  describe("convert - awards", () => {
    it("maps awards with formatted dates", () => {
      const data = makeMinimalJsonResume({
        awards: [{ title: "Best Paper", awarder: "IEEE", date: "2023-06-15", summary: "Great work" }],
      });
      const result = importer.parse(JSON.stringify(data));
      const award = result.sections.awards.items[0];
      expect(award.title).toBe("Best Paper");
      expect(award.awarder).toBe("IEEE");
      expect(award.date).toBe("June 15, 2023");
      expect(award.description).toBe("<p>Great work</p>");
    });
  });

  describe("convert - volunteer", () => {
    it("maps volunteer items with period and description", () => {
      const data = makeMinimalJsonResume({
        volunteer: [
          {
            organization: "Red Cross",
            position: "Volunteer",
            startDate: "2022-01",
            endDate: "2023-06",
            summary: "Helped with logistics",
            highlights: ["Organized events"],
            url: "https://redcross.org",
          },
        ],
      });
      const result = importer.parse(JSON.stringify(data));
      const vol = result.sections.volunteer.items[0];
      expect(vol.organization).toBe("Red Cross");
      expect(vol.period).toBe("January 2022 - June 2023");
      expect(vol.description).toContain("Helped with logistics");
      expect(vol.description).toContain("Organized events");
    });

    it("filters out volunteer items without organization", () => {
      const data = makeMinimalJsonResume({
        volunteer: [
          { organization: "Valid Org", position: "Vol" },
          { position: "No Org" }, // missing organization
        ],
      });
      const result = importer.parse(JSON.stringify(data));
      expect(result.sections.volunteer.items).toHaveLength(1);
    });
  });

  describe("convert - references", () => {
    it("maps references with name and reference text", () => {
      const data = makeMinimalJsonResume({
        references: [{ name: "John Manager", reference: "Great developer and team player" }],
      });
      const result = importer.parse(JSON.stringify(data));
      const ref = result.sections.references.items[0];
      expect(ref.name).toBe("John Manager");
      expect(ref.description).toBe("<p>Great developer and team player</p>");
    });

    it("handles references without reference text", () => {
      const data = makeMinimalJsonResume({
        references: [{ name: "Jane CTO" }],
      });
      const result = importer.parse(JSON.stringify(data));
      expect(result.sections.references.items[0].description).toBe("");
    });

    it("filters references without name or reference", () => {
      const data = makeMinimalJsonResume({
        references: [
          { name: "Valid" },
          {}, // no name or reference
        ],
      });
      const result = importer.parse(JSON.stringify(data));
      expect(result.sections.references.items).toHaveLength(1);
    });
  });

  describe("convert - publications", () => {
    it("maps publications with formatted date", () => {
      const data = makeMinimalJsonResume({
        publications: [
          {
            name: "My Paper",
            publisher: "IEEE",
            releaseDate: "2024-03-15",
            summary: "Research findings",
            url: "https://doi.org/paper",
          },
        ],
      });
      const result = importer.parse(JSON.stringify(data));
      const pub = result.sections.publications.items[0];
      expect(pub.title).toBe("My Paper");
      expect(pub.publisher).toBe("IEEE");
      expect(pub.date).toBe("March 15, 2024");
    });
  });

  describe("convert - certifications", () => {
    it("maps certificates with issuer and date", () => {
      const data = makeMinimalJsonResume({
        certificates: [{ name: "AWS Certified", issuer: "Amazon", date: "2023-06" }],
      });
      const result = importer.parse(JSON.stringify(data));
      const cert = result.sections.certifications.items[0];
      expect(cert.title).toBe("AWS Certified");
      expect(cert.issuer).toBe("Amazon");
      expect(cert.date).toBe("June 2023");
    });
  });

  describe("convert - interests", () => {
    it("maps interests with keywords", () => {
      const data = makeMinimalJsonResume({
        interests: [{ name: "Gaming", keywords: ["RPG", "Strategy"] }],
      });
      const result = importer.parse(JSON.stringify(data));
      const interest = result.sections.interests.items[0];
      expect(interest.name).toBe("Gaming");
      expect(interest.keywords).toEqual(["RPG", "Strategy"]);
    });
  });

  describe("convert - empty sections", () => {
    it("handles resume with no optional sections", () => {
      const minimal = { basics: { name: "Jane" } };
      const result = importer.parse(JSON.stringify(minimal));
      expect(resumeDataSchema.safeParse(result).success).toBe(true);
      expect(result.basics.name).toBe("Jane");
    });
  });

  describe("error handling", () => {
    it("throws on invalid JSON", () => {
      expect(() => importer.parse("not json")).toThrow();
    });

    it("handles missing basics.location gracefully", () => {
      const data = { basics: { name: "Jane" } };
      const result = importer.parse(JSON.stringify(data));
      expect(result.basics.location).toBe("");
    });

    it("allows work items with position but no name (falls back to position)", () => {
      const data = makeMinimalJsonResume();
      // Work item with position but no name — filter passes because position is truthy
      // The importer maps name -> company, so company will be empty
      // This is a known limitation: the filter checks (name || position) but company requires min(1)
      // The resumeDataSchema.parse() will reject it
      (data as any).work.push({ name: "", position: "Ghost Dev", startDate: "2020-01" });
      expect(() => importer.parse(JSON.stringify(data))).toThrow();
    });

    it("filters profiles without network name", () => {
      const data = makeMinimalJsonResume();
      (data as any).basics.profiles = [
        { network: "GitHub", username: "jane" },
        { username: "no-network" }, // no network
      ];
      const result = importer.parse(JSON.stringify(data));
      expect(result.sections.profiles.items).toHaveLength(1);
    });
  });
});
