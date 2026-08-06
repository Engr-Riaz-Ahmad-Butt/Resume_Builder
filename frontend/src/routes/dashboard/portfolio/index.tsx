import { Trans } from "@lingui/react/macro";
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  LinkSimpleIcon,
  ReadCvLogoIcon,
  SpinnerIcon,
  VideoCameraIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/portfolio/")({
  component: PortfolioPage,
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

function ResumeSection() {
  const { data: session } = authClient.useSession();
  // username exists at runtime even though the auth TS types don't expose it
  const username = (session?.user as Record<string, unknown> | undefined)?.username as string | undefined;

  const { data: resumes, isLoading } = useQuery(orpc.resume.list.queryOptions());

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  if (!resumes || resumes.length === 0) {
    return (
      <Alert>
        <ReadCvLogoIcon className="size-4" />
        <AlertTitle><Trans>No resumes yet</Trans></AlertTitle>
        <AlertDescription>
          <Trans>
            Create a resume first to include it in your portfolio.{" "}
            <Link to="/dashboard/resumes" className="underline">
              Go to Resumes
            </Link>
          </Trans>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {resumes.map((resume) => (
        <div key={resume.id} className="flex items-center justify-between rounded-md border p-4">
          <div className="flex items-center gap-3">
            <ReadCvLogoIcon className="size-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{resume.name}</p>
              <p className="text-xs text-muted-foreground">
                {resume.isPublic ? (
                  <span className="text-green-600"><Trans>Public</Trans></span>
                ) : (
                  <span><Trans>Private</Trans></span>
                )}
              </p>
            </div>
          </div>
          {resume.isPublic && username && (
            <a
              href={`/${username}/${resume.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <ArrowSquareOutIcon className="size-4" />
            </a>
          )}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        <Trans>
          To make a resume public, open it in the builder and toggle visibility in the Share settings.
        </Trans>
      </p>
    </div>
  );
}

function VideoSection() {
  const { data: latestVideo, isLoading } = useQuery(orpc.video.getLatest.queryOptions());

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  if (!latestVideo) {
    return (
      <Alert>
        <VideoCameraIcon className="size-4" />
        <AlertTitle><Trans>No video analysis yet</Trans></AlertTitle>
        <AlertDescription>
          <Trans>
            Upload a video to get communication scores.{" "}
            <Link to="/dashboard/video-analysis" className="underline">
              Go to Video Analysis
            </Link>
          </Trans>
        </AlertDescription>
      </Alert>
    );
  }

  const isCompleted = latestVideo.status === "completed";
  const isProcessing = latestVideo.status === "processing";

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium"><Trans>Latest Video Analysis</Trans></p>
        <Badge
          className={cn(
            isCompleted && "bg-green-500/10 text-green-600 border-green-500/30",
            isProcessing && "bg-blue-500/10 text-blue-600 border-blue-500/30",
            !isCompleted && !isProcessing && "bg-red-500/10 text-red-600 border-red-500/30",
          )}
        >
          {isCompleted && <CheckCircleIcon className="mr-1 size-3" />}
          {isProcessing && <SpinnerIcon className="mr-1 size-3 animate-spin" />}
          {!isCompleted && !isProcessing && <WarningCircleIcon className="mr-1 size-3" />}
          {latestVideo.status}
        </Badge>
      </div>

      {isProcessing && (
        <p className="text-sm text-muted-foreground">
          <Trans>Analysis is running. Check back in a few minutes.</Trans>
        </p>
      )}

      {isCompleted && (
        <div className="space-y-3">
          <ScoreBar label="Professionalism" value={latestVideo.professionalism} />
          <ScoreBar label="Energy Level" value={latestVideo.energyLevels} />
          <ScoreBar label="Communication" value={latestVideo.communication} />
          <ScoreBar label="Sociability" value={latestVideo.sociability} />
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link to="/dashboard/video-analysis" />}
      >
        <VideoCameraIcon className="mr-2 size-4" />
        <Trans>View Full Analysis</Trans>
      </Button>
    </div>
  );
}

function PublicPortfolioLink() {
  const { data: session } = authClient.useSession();
  const username = (session?.user as Record<string, unknown> | undefined)?.username as
    | string
    | undefined;
  const { data: resumes } = useQuery(orpc.resume.list.queryOptions());

  if (!username) return null;

  const publicResume = resumes?.find((r) => r.isPublic);
  const portfolioUrl = publicResume
    ? `${window.location.origin}/${username}/${publicResume.slug}`
    : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
      <LinkSimpleIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          <Trans>Your Public Profile URL</Trans>
        </p>
        {portfolioUrl ? (
          <p className="truncate text-xs text-muted-foreground">{portfolioUrl}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Trans>
              Make at least one resume public in the builder Share settings to get a public URL.
            </Trans>
          </p>
        )}
      </div>
      {portfolioUrl && (
        <a
          href={portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ArrowSquareOutIcon className="size-4" />
        </a>
      )}
    </div>
  );
}

function PortfolioPage() {
  return (
    <div className="space-y-8 p-6">
      <DashboardHeader title="Portfolio" icon={IdentificationCardIcon} />

      <PublicPortfolioLink />

      <Separator />

      <section className="space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ReadCvLogoIcon className="size-5" />
          <Trans>Resumes</Trans>
        </h2>
        <ResumeSection />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <VideoCameraIcon className="size-5" />
          <Trans>Video Introduction</Trans>
        </h2>
        <VideoSection />
      </section>
    </div>
  );
}
