import { protectedProcedure, publicProcedure } from "../context";

/**
 * AppRouter shell (M06). Domain routers (resume, storage, …) are added in later modules.
 */
const router = {
  auth: {
    /** Public smoke procedure */
    ping: publicProcedure.handler(async () => ({ ok: true as const })),
    /** Protected procedure — unauthenticated calls must yield UNAUTHORIZED */
    me: protectedProcedure.handler(async ({ context }) => ({
      id: context.user.id,
      email: context.user.email,
    })),
  },
};

export default router;
export type AppRouter = typeof router;
