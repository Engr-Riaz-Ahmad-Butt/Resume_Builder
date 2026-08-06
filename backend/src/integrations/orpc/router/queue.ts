import { z } from "zod";

import { enqueuePing } from "@/integrations/queue/ping";

import { protectedProcedure } from "../context";

export const queueRouter = {
  enqueuePing: protectedProcedure
    .input(z.object({ message: z.string().min(1).max(500) }))
    .handler(async ({ input }) => enqueuePing(input.message)),
};
