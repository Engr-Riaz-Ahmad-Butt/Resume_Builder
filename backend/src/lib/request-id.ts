import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export function resolveRequestId(incoming: string | undefined): string {
  const trimmed = incoming?.trim();
  if (trimmed && trimmed.length > 0 && trimmed.length <= 128) {
    return trimmed;
  }
  return randomUUID();
}
