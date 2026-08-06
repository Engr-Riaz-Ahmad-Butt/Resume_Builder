import { v7 as uuidv7 } from "uuid";

/** Generates a unique ID using UUIDv7. */
export function generateId(): string {
  return uuidv7();
}
