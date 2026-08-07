import { ORPCError } from "@orpc/client";
import { Trans } from "@lingui/react/macro";
import {
  ArrowSquareOutIcon,
  IdentificationCardIcon,
  ReadCvLogoIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

export const Route = createFileRoute("/p/$username/$slug")({
  component: PublicPortfolioPage,
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(
      orpc.portfolio.getPublic.queryOptions({
        input: { username: params.username, slug: params.slug },
      }),
    );
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.portfolio.name} · ${loaderData.owner.displayUsername} - Reactive Resume`
          : "Portfolio - Reactive Resume",
      },
    ],
  }),
  onError: (error) => {
    if (error instanceof ORPCError) throw notFound();
    throw error;
  },
});

function ScoreBar({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const numericVal = typeof value === "string" ? parseFloat(value.replace("%", "")) : value;
  const percent = Number.isNaN(numericVal) ? 0 : Math.min(100, Math.max(0, numericVal));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{typeof value === "string" ? value : `${Math.round(percent)}%`}</span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}

function PublicPortfolioPage() {
  const { username, slug } = Route.useParams();
  const { data, isLoading } = useQuery(
    orpc.portfolio.getPublic.queryOptions({ input: { username, slug } }),
  );

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { portfolio, owner, resume, latestVideo } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <header className="space-y-2">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <IdentificationCardIcon className="size-4" />
          <Trans>Portfolio</Trans>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{portfolio.name}</h1>
        <p className="text-muted-foreground text-sm">
          {owner.name} · @{owner.displayUsername || owner.username}
        </p>
      </header>

      <Separator />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ReadCvLogoIcon className="size-5" />
          <Trans>Resume</Trans>
        </h2>
        {resume ? (
          <a
            href={`/${owner.username}/${resume.slug}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex w-full items-center justify-between",
            )}
          >
            <span>{resume.name}</span>
            <ArrowSquareOutIcon className="size-4" />
          </a>
        ) : (
          <p className="text-muted-foreground text-sm">
            <Trans>No public resume linked to this portfolio.</Trans>
          </p>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <VideoCameraIcon className="size-5" />
          <Trans>Video introduction</Trans>
        </h2>
        {latestVideo && latestVideo.status === "completed" ? (
          <div className="space-y-3 rounded-lg border p-4">
            {latestVideo.overallScore != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  <Trans>Overall score</Trans>
                </span>
                <Badge variant="secondary">{Math.round(latestVideo.overallScore)}</Badge>
              </div>
            )}
            <ScoreBar label="Professionalism" value={latestVideo.professionalism} />
            <ScoreBar label="Energy Level" value={latestVideo.energyLevels} />
            <ScoreBar label="Communication" value={latestVideo.communication} />
            <ScoreBar label="Sociability" value={latestVideo.sociability} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            <Trans>No completed video analysis yet.</Trans>
          </p>
        )}
      </section>
    </div>
  );
}
