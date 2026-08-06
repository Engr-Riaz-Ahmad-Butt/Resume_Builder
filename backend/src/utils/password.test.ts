import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("returns a bcrypt hash string", async () => {
    const hash = await hashPassword("my-password");
    expect(hash).toMatch(/^\$2[aby]?\$\d+\$/);
  });

  it("produces different hashes for the same password (salted)", async () => {
    const hash1 = await hashPassword("same-password");
    const hash2 = await hashPassword("same-password");
    expect(hash1).not.toBe(hash2);
  });

  it("produces a hash of expected length (~60 chars)", async () => {
    const hash = await hashPassword("test");
    expect(hash.length).toBe(60);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("correct-password", hash);
    expect(result).toBe(true);
  });

  it("returns false for incorrect password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  it("handles empty passwords", async () => {
    const hash = await hashPassword("");
    expect(await verifyPassword("", hash)).toBe(true);
    expect(await verifyPassword("notempty", hash)).toBe(false);
  });

  it("handles special characters", async () => {
    const password = "p@$$w0rd!#%&*(){}[]|\\/<>?";
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it("handles unicode characters", async () => {
    const password = "パスワード123";
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });
});
