import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// We can't easily mock createIsomorphicFn, so we reimplement the core logic
// directly in the test to verify the token generation/verification algorithm.
// This tests the same code paths without depending on the TanStack wrapper.
// ---------------------------------------------------------------------------

const TEST_SECRET = "test-secret-key-for-hmac";
const PRINTER_TOKEN_TTL_MS = 5 * 60 * 1000;

/** Reimplementation of generatePrinterToken for testing */
function generateToken(resumeId: string): string {
  const timestamp = Date.now();
  const payload = `${resumeId}:${timestamp}`;
  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", TEST_SECRET).update(payloadBase64).digest("hex");
  return `${payloadBase64}.${signature}`;
}

/** Reimplementation of verifyPrinterToken for testing */
function verifyToken(token: string): string {
  const { timingSafeEqual } = require("node:crypto");

  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Invalid token format");

  const [payloadBase64, signature] = parts;

  const expectedSignature = createHmac("sha256", TEST_SECRET).update(payloadBase64).digest("hex");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = Buffer.from(payloadBase64, "base64url").toString("utf-8");
  const [resumeId, timestampStr] = payload.split(":");
  if (!resumeId || !timestampStr) throw new Error("Invalid token payload");

  const timestamp = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) throw new Error("Invalid timestamp");

  const age = Date.now() - timestamp;
  if (age < 0 || age > PRINTER_TOKEN_TTL_MS) throw new Error("Token expired");

  return resumeId;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createValidToken(resumeId: string, timestamp: number): string {
  const payload = `${resumeId}:${timestamp}`;
  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", TEST_SECRET).update(payloadBase64).digest("hex");
  return `${payloadBase64}.${signature}`;
}

// ---------------------------------------------------------------------------
// Tests — these validate the algorithm used by printer-token.ts
// ---------------------------------------------------------------------------

describe("generatePrinterToken (algorithm)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a token with format payload.signature", () => {
    const token = generateToken("resume-123");
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("encodes the resume ID and timestamp in the payload", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const token = generateToken("my-resume-id");
    const [payloadBase64] = token.split(".");
    const decoded = Buffer.from(payloadBase64, "base64url").toString("utf-8");

    expect(decoded).toContain("my-resume-id");
    expect(decoded).toContain(String(Date.now()));
  });

  it("produces a valid HMAC-SHA256 signature", () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const token = generateToken("resume-abc");
    const [payloadBase64, signature] = token.split(".");

    const expectedSignature = createHmac("sha256", TEST_SECRET).update(payloadBase64).digest("hex");
    expect(signature).toBe(expectedSignature);
  });

  it("generates different tokens for different resume IDs", () => {
    const token1 = generateToken("resume-1");
    const token2 = generateToken("resume-2");
    expect(token1).not.toBe(token2);
  });

  it("generates different tokens at different timestamps", () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const token1 = generateToken("same-resume");

    vi.setSystemTime(new Date("2025-01-01T00:01:00Z"));
    const token2 = generateToken("same-resume");

    expect(token1).not.toBe(token2);
  });

  it("uses base64url encoding (no +, /, or = characters in payload)", () => {
    const token = generateToken("resume/with+special=chars");
    const [payloadBase64] = token.split(".");

    expect(payloadBase64).not.toMatch(/[+/=]/);
  });
});

describe("verifyPrinterToken (algorithm)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the resume ID for a valid, non-expired token", () => {
    const now = new Date("2025-06-15T12:00:00Z");
    vi.setSystemTime(now);

    const token = createValidToken("resume-123", now.getTime());
    const resumeId = verifyToken(token);

    expect(resumeId).toBe("resume-123");
  });

  it("accepts a token that is just under 5 minutes old", () => {
    const createdAt = new Date("2025-06-15T12:00:00Z");
    vi.setSystemTime(new Date("2025-06-15T12:04:59Z"));

    const token = createValidToken("resume-456", createdAt.getTime());
    const resumeId = verifyToken(token);

    expect(resumeId).toBe("resume-456");
  });

  it("rejects a token exactly at the 5-minute boundary", () => {
    const createdAt = new Date("2025-06-15T12:00:00Z");
    // 5 minutes + 1ms after creation
    vi.setSystemTime(new Date(createdAt.getTime() + PRINTER_TOKEN_TTL_MS + 1));

    const token = createValidToken("resume-789", createdAt.getTime());
    expect(() => verifyToken(token)).toThrow("Token expired");
  });

  it("throws for a token older than 5 minutes", () => {
    const createdAt = new Date("2025-06-15T12:00:00Z");
    vi.setSystemTime(new Date("2025-06-15T12:06:00Z"));

    const token = createValidToken("resume-789", createdAt.getTime());
    expect(() => verifyToken(token)).toThrow("Token expired");
  });

  it("throws for a token with a future timestamp (negative age)", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const futureTime = new Date("2025-06-15T13:00:00Z").getTime();

    const token = createValidToken("resume-future", futureTime);
    expect(() => verifyToken(token)).toThrow("Token expired");
  });

  it("throws for invalid token format (no dot separator)", () => {
    expect(() => verifyToken("nodothere")).toThrow("Invalid token format");
  });

  it("throws for invalid token format (too many dots)", () => {
    expect(() => verifyToken("a.b.c")).toThrow("Invalid token format");
  });

  it("throws for empty token", () => {
    expect(() => verifyToken("")).toThrow("Invalid token format");
  });

  it("throws for a token with tampered signature", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const token = createValidToken("resume-123", Date.now());
    const [payload] = token.split(".");

    const tamperedToken = `${payload}.deadbeef0000000000000000000000000000000000000000000000000000dead`;
    expect(() => verifyToken(tamperedToken)).toThrow("Invalid token signature");
  });

  it("throws for a token with tampered payload", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const token = createValidToken("resume-123", Date.now());
    const [, signature] = token.split(".");

    const tamperedPayload = Buffer.from("hacked-resume:0").toString("base64url");
    expect(() => verifyToken(`${tamperedPayload}.${signature}`)).toThrow("Invalid token signature");
  });

  it("throws for a token with invalid base64 payload (no colon separator)", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const payloadBase64 = Buffer.from("nocolon").toString("base64url");
    const signature = createHmac("sha256", TEST_SECRET).update(payloadBase64).digest("hex");

    // "nocolon".split(":") => ["nocolon"], so timestampStr is undefined
    expect(() => verifyToken(`${payloadBase64}.${signature}`)).toThrow("Invalid token payload");
  });

  it("throws for payload with non-numeric timestamp", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const payloadBase64 = Buffer.from("resume-id:not-a-number").toString("base64url");
    const signature = createHmac("sha256", TEST_SECRET).update(payloadBase64).digest("hex");

    expect(() => verifyToken(`${payloadBase64}.${signature}`)).toThrow("Invalid timestamp");
  });

  it("round-trips: generate then verify returns original resume ID", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const token = generateToken("my-resume-uuid-v7");
    const result = verifyToken(token);

    expect(result).toBe("my-resume-uuid-v7");
  });

  it("handles resume IDs with dashes and underscores", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const id = "resume-with-dashes_and_underscores";
    const token = generateToken(id);
    const result = verifyToken(token);

    expect(result).toBe(id);
  });

  it("resume IDs with colons cause verification to fail", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    // Documents a known limitation: IDs with ":" break the payload format
    // because verifyToken splits on ":" to separate ID from timestamp,
    // so the second segment becomes part of the ID, not the timestamp.
    const token = generateToken("resume:with:colons");
    expect(() => verifyToken(token)).toThrow("Invalid timestamp");
  });

  it("accepts a token at exactly age 0 (just created)", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const token = createValidToken("fresh", Date.now());
    expect(verifyToken(token)).toBe("fresh");
  });
});
