import type { Context, Next } from "hono";

/**
 * Baseline security headers for the API service.
 * Content-Security-Policy is intentionally omitted for a JSON API.
 */
export async function securityHeadersMiddleware(c: Context, next: Next): Promise<void> {
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-XSS-Protection", "0");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Cross-Origin-Resource-Policy", "same-site");
}
