import z from "zod";

import { protectedProcedure, publicProcedure } from "../context";
import { portfolioService } from "../services/portfolio";

const portfolioSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isPublic: z.boolean(),
  resumeId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const portfolioRouter = {
  create: protectedProcedure
    .route({
      method: "POST",
      path: "/portfolios",
      tags: ["Portfolio"],
      operationId: "createPortfolio",
      summary: "Create a portfolio hub",
    })
    .input(
      z.object({
        name: z.string().min(1).max(120),
        slug: z.string().min(1).max(120).optional(),
        resumeId: z.string().uuid().optional(),
      }),
    )
    .output(portfolioSchema)
    .handler(async ({ context, input }) => {
      return portfolioService.create({
        userId: context.user.id,
        name: input.name,
        slug: input.slug,
        resumeId: input.resumeId,
      });
    }),

  list: protectedProcedure
    .route({
      method: "GET",
      path: "/portfolios",
      tags: ["Portfolio"],
      operationId: "listPortfolios",
      summary: "List portfolios for the current user",
    })
    .output(z.array(portfolioSchema))
    .handler(async ({ context }) => {
      return portfolioService.list(context.user.id);
    }),

  update: protectedProcedure
    .route({
      method: "PATCH",
      path: "/portfolios/{id}",
      tags: ["Portfolio"],
      operationId: "updatePortfolio",
      summary: "Update a portfolio hub",
    })
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        slug: z.string().min(1).max(120).optional(),
        resumeId: z.string().uuid().nullable().optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .output(portfolioSchema)
    .handler(async ({ context, input }) => {
      return portfolioService.update({
        id: input.id,
        userId: context.user.id,
        name: input.name,
        slug: input.slug,
        resumeId: input.resumeId,
        isPublic: input.isPublic,
      });
    }),

  delete: protectedProcedure
    .route({
      method: "DELETE",
      path: "/portfolios/{id}",
      tags: ["Portfolio"],
      operationId: "deletePortfolio",
      summary: "Delete a portfolio hub",
    })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ id: z.string().uuid() }))
    .handler(async ({ context, input }) => {
      return portfolioService.delete({ id: input.id, userId: context.user.id });
    }),

  getPublic: publicProcedure
    .route({
      method: "GET",
      path: "/portfolios/public/{username}/{slug}",
      tags: ["Portfolio"],
      operationId: "getPublicPortfolio",
      summary: "Get a public portfolio hub by username and slug",
    })
    .input(
      z.object({
        username: z.string().min(1),
        slug: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      return portfolioService.getPublic(input);
    }),
};
