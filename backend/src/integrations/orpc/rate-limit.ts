/**
 * TEMP (M05): in-memory IP header list for Better Auth.
 * Full oRPC rate limiting lands later; Redis-backed RL in M13.
 */
export const TRUSTED_IP_HEADERS = [
  "CF-Connecting-IP",
  "CF-Connecting-IPv6",
  "True-Client-IP",
  "X-Forwarded-For",
  "X-Real-IP",
];
