import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../lib/env.js";

const PRINTER_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generates a time-limited token for printer route access.
 * Token format: base64(resumeId:timestamp).signature
 */
export function generatePrinterToken(resumeId: string): string {
  const timestamp = Date.now();
  const payload = `${resumeId}:${timestamp}`;
  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", env.AUTH_SECRET).update(payloadBase64).digest("hex");
  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies a printer token and returns the resume ID if valid.
 * Throws an error if the token is invalid or expired.
 */
export function verifyPrinterToken(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Invalid token format");

  const [payloadBase64, signature] = parts;
  if (!payloadBase64 || !signature) throw new Error("Invalid token format");

  const expectedSignature = createHmac("sha256", env.AUTH_SECRET)
    .update(payloadBase64)
    .digest("hex");
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
