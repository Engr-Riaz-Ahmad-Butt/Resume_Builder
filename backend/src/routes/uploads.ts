import { Hono } from "hono";

import { getStorageService, inferContentType } from "@/integrations/orpc/services/storage";

const storageService = getStorageService();

/**
 * Serve uploaded files: GET /uploads/{userId}/...
 * Lifted from frontend/src/routes/uploads/$userId.$.tsx
 */
export const uploadsRoutes = new Hono().get("/uploads/:userId/*", async (c) => {
  const userId = c.req.param("userId");
  const pathname = new URL(c.req.url).pathname;
  const pathAfterUploads = pathname.replace(/^\/uploads\//, "");
  const filePath = pathAfterUploads.slice(userId.length + 1); // after "userId/"
  const key = `uploads/${userId}/${filePath}`;

  if (!filePath || filePath.includes("..")) {
    return c.json({ error: "Not Found" }, 404);
  }

  const result = await storageService.read(key);
  if (!result) return c.json({ error: "Not Found" }, 404);

  const contentType = result.contentType ?? inferContentType(key);
  return new Response(Buffer.from(result.data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(result.size),
      ...(result.etag ? { ETag: result.etag } : {}),
      ...(result.lastModified ? { "Last-Modified": result.lastModified.toUTCString() } : {}),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
