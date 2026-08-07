import { aiRouter } from "./ai";
import { jobsRouter } from "./jobs";
import { protectedProcedure, publicProcedure } from "../context";
import { portfolioRouter } from "./portfolio";
import { resumeRouter } from "./resume";
import { printerRouter } from "./printer";
import { storageRouter } from "./storage";
import { queueRouter } from "./queue";
import { videoRouter } from "./video";

/**
 * AppRouter — domain routers accumulate across modules.
 * FLAG(M07): jsonb read-path validation is a follow-up (see EXTRACTION_NOTES).
 */
const router = {
  auth: {
    ping: publicProcedure.handler(async () => ({ ok: true as const })),
    me: protectedProcedure.handler(async ({ context }) => ({
      id: context.user.id,
      email: context.user.email,
    })),
  },
  resume: resumeRouter,
  storage: storageRouter,
  printer: printerRouter,
  ai: aiRouter,
  jobs: jobsRouter,
  queue: queueRouter,
  video: videoRouter,
  portfolio: portfolioRouter,
};

export default router;
export type AppRouter = typeof router;
