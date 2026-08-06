import { createHash } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";

// ---------------------------------------------------------------------------
// We test the pure crypto helpers directly (signResumeAccessToken, safeEquals)
// since they don't depend on cookies or env.
// The actual module uses private functions, so we reimplement and test the algorithm.
// ---------------------------------------------------------------------------

function signResumeAccessToken(resumeId: string, passwordHash: string): string {
  return createHash("sha256").update(`${resumeId}:${passwordHash}`).digest("hex");
}

function safeEquals(value: string, expected: string): boolean {
  const { timingSafeEqual } = require("node:crypto");
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  if (valueBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function getResumeAccessCookieName(resumeId: string): string {
  return `resume_access_${resumeId}`;
}

// ---------------------------------------------------------------------------
// signResumeAccessToken
// ---------------------------------------------------------------------------

describe("signResumeAccessToken", () => {
  it("produces a hex SHA256 hash", () => {
    const token = signResumeAccessToken("resume-123", "hashed-password");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces consistent results for same inputs", () => {
    const t1 = signResumeAccessToken("resume-1", "pw-hash");
    const t2 = signResumeAccessToken("resume-1", "pw-hash");
    expect(t1).toBe(t2);
  });

  it("produces different tokens for different resume IDs", () => {
    const t1 = signResumeAccessToken("resume-1", "pw-hash");
    const t2 = signResumeAccessToken("resume-2", "pw-hash");
    expect(t1).not.toBe(t2);
  });

  it("produces different tokens for different password hashes", () => {
    const t1 = signResumeAccessToken("resume-1", "hash-a");
    const t2 = signResumeAccessToken("resume-1", "hash-b");
    expect(t1).not.toBe(t2);
  });

  it("handles empty inputs", () => {
    const token = signResumeAccessToken("", "");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// safeEquals
// ---------------------------------------------------------------------------

describe("safeEquals", () => {
  it("returns true for equal strings", () => {
    expect(safeEquals("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(safeEquals("abc123", "abc456")).toBe(false);
  });

  it("returns false for strings of different lengths", () => {
    expect(safeEquals("short", "much-longer-string")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(safeEquals("", "")).toBe(true);
  });

  it("returns false for empty vs non-empty", () => {
    expect(safeEquals("", "notempty")).toBe(false);
  });

  it("handles long hex strings (like SHA256 hashes)", () => {
    const hash = signResumeAccessToken("id", "pw");
    expect(safeEquals(hash, hash)).toBe(true);
    expect(safeEquals(hash, hash.replace(/.$/, "0"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getResumeAccessCookieName
// ---------------------------------------------------------------------------

describe("getResumeAccessCookieName", () => {
  it("prefixes resume ID with resume_access_", () => {
    expect(getResumeAccessCookieName("abc-123")).toBe("resume_access_abc-123");
  });

  it("handles various ID formats", () => {
    expect(getResumeAccessCookieName("01234567-89ab-cdef-0123-456789abcdef")).toBe(
      "resume_access_01234567-89ab-cdef-0123-456789abcdef",
    );
  });
});
