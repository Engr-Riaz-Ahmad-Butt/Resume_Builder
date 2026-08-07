import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { flagsRouter } from "./flags";
import { jobsRouter } from "./jobs";
import { portfolioRouter } from "./portfolio";
import { printerRouter } from "./printer";
import { resumeRouter } from "./resume";
import { statisticsRouter } from "./statistics";
import { storageRouter } from "./storage";
import { videoRouter } from "./video";

export default {
  ai: aiRouter,
  auth: authRouter,
  flags: flagsRouter,
  jobs: jobsRouter,
  portfolio: portfolioRouter,
  printer: printerRouter,
  resume: resumeRouter,
  statistics: statisticsRouter,
  storage: storageRouter,
  video: videoRouter,
};
