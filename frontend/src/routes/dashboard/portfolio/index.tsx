import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  LinkSimpleIcon,
  PlusIcon,
  ReadCvLogoIcon,
  SpinnerIcon,
  TrashIcon,
  VideoCameraIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";
import { getOrpcErrorMessage } from "@/utils/error-message";
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

function CreatePortfolioForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const { data: resumes } = useQuery(orpc.resume.list.queryOptions());
  const [resumeId, setResumeId] = useState<string>("");

  const { mutate: createPortfolio, isPending } = useMutation({
    ...orpc.portfolio.create.mutationOptions(),
    onSuccess: async () => {
      setName("");
      setResumeId("");
      await queryClient.invalidateQueries({ queryKey: orpc.portfolio.list.queryOptions().queryKey });
      toast.success(t`Portfolio created.`);
    },
    onError: (error) => {
      toast.error(t`Failed to create portfolio.`, {
        description: getOrpcErrorMessage(error, {
          fallback: t`Something went wrong. Please try again.`,
          allowServerMessage: true,
        }),
      });
    },
  });

  return (
    <form
      className="space-y-3 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        createPortfolio({
          name: name.trim(),
          resumeId: resumeId || undefined,
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="portfolio-name">
          <Trans>Name</Trans>
        </Label>
        <Input
          id="portfolio-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t`My portfolio`}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="portfolio-resume">
          <Trans>Linked resume (optional)</Trans>
        </Label>
        <select
          id="portfolio-resume"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={resumeId}
          onChange={(e) => setResumeId(e.target.value)}
        >
          <option value="">
            {t`None`}
          </option>
          {(resumes ?? []).map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending || !name.trim()}>
        <PlusIcon className="mr-2 size-4" />
        {isPending ? t`Creating...` : t`Create portfolio`}
      </Button>
    </form>
  );
}

function PortfolioList() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const username = (session?.user as Record<string, unknown> | undefined)?.username as
    | string
    | undefined;
  const { data: portfolios, isLoading } = useQuery(orpc.portfolio.list.queryOptions());

  const { mutate: updatePortfolio } = useMutation({
    ...orpc.portfolio.update.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.portfolio.list.queryOptions().queryKey });
    },
    onError: (error) => {
      toast.error(t`Failed to update portfolio.`, {
        description: getOrpcErrorMessage(error, {
          fallback: t`Something went wrong. Please try again.`,
          allowServerMessage: true,
        }),
      });
    },
  });

  const { mutate: deletePortfolio } = useMutation({
    ...orpc.portfolio.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.portfolio.list.queryOptions().queryKey });
      toast.success(t`Portfolio deleted.`);
    },
    onError: (error) => {
      toast.error(t`Failed to delete portfolio.`, {
        description: getOrpcErrorMessage(error, {
          fallback: t`Something went wrong. Please try again.`,
          allowServerMessage: true,
        }),
      });
    },
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  if (!portfolios || portfolios.length === 0) {
    return (
      <Alert>
        <IdentificationCardIcon className="size-4" />
        <AlertTitle>
          <Trans>No portfolios yet</Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>Create a portfolio hub to share your resume and video scores publicly.</Trans>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {portfolios.map((portfolio) => {
        const publicUrl =
          username && portfolio.isPublic
            ? `${window.location.origin}/p/${username}/${portfolio.slug}`
            : null;

        return (
          <div key={portfolio.id} className="space-y-3 rounded-md border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{portfolio.name}</p>
                <p className="text-muted-foreground truncate text-xs">/p/{username ?? "…"}/{portfolio.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={portfolio.isPublic}
                  onCheckedChange={(checked) =>
                    updatePortfolio({ id: portfolio.id, isPublic: checked })
                  }
                  aria-label={t`Toggle public`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deletePortfolio({ id: portfolio.id })}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            </div>
            {publicUrl ? (
              <div className="flex items-center gap-2">
                <LinkSimpleIcon className="text-muted-foreground size-4 shrink-0" />
                <p className="text-muted-foreground truncate text-xs">{publicUrl}</p>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <ArrowSquareOutIcon className="size-4" />
                </a>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                <Trans>Make this portfolio public to get a shareable URL.</Trans>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResumeSection() {
  const { data: session } = authClient.useSession();
  const username = (session?.user as Record<string, unknown> | undefined)?.username as string | undefined;
  const { data: resumes, isLoading } = useQuery(orpc.resume.list.queryOptions());

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  if (!resumes || resumes.length === 0) {
    return (
      <Alert>
        <ReadCvLogoIcon className="size-4" />
        <AlertTitle>
          <Trans>No resumes yet</Trans>
        </AlertTitle>
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
            <ReadCvLogoIcon className="text-muted-foreground size-5" />
            <div>
              <p className="font-medium">{resume.name}</p>
              <p className="text-muted-foreground text-xs">
                {resume.isPublic ? (
                  <span className="text-green-600">
                    <Trans>Public</Trans>
                  </span>
                ) : (
                  <span>
                    <Trans>Private</Trans>
                  </span>
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
        <AlertTitle>
          <Trans>No video analysis yet</Trans>
        </AlertTitle>
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
        <p className="text-sm font-medium">
          <Trans>Latest Video Analysis</Trans>
        </p>
        <Badge
          className={cn(
            isCompleted && "border-green-500/30 bg-green-500/10 text-green-600",
            isProcessing && "border-blue-500/30 bg-blue-500/10 text-blue-600",
            !isCompleted && !isProcessing && "border-red-500/30 bg-red-500/10 text-red-600",
          )}
        >
          {isCompleted && <CheckCircleIcon className="mr-1 size-3" />}
          {isProcessing && <SpinnerIcon className="mr-1 size-3 animate-spin" />}
          {!isCompleted && !isProcessing && <WarningCircleIcon className="mr-1 size-3" />}
          {latestVideo.status}
        </Badge>
      </div>

      {isProcessing && (
        <p className="text-muted-foreground text-sm">
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

      <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/dashboard/video-analysis" />}>
        <VideoCameraIcon className="mr-2 size-4" />
        <Trans>View Full Analysis</Trans>
      </Button>
    </div>
  );
}

function PortfolioPage() {
  return (
    <div className="space-y-8 p-6">
      <DashboardHeader title="Portfolio" icon={IdentificationCardIcon} />

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <IdentificationCardIcon className="size-5" />
          <Trans>Your portfolios</Trans>
        </h2>
        <CreatePortfolioForm />
        <PortfolioList />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ReadCvLogoIcon className="size-5" />
          <Trans>Resumes</Trans>
        </h2>
        <ResumeSection />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <VideoCameraIcon className="size-5" />
          <Trans>Video Introduction</Trans>
        </h2>
        <VideoSection />
      </section>
    </div>
  );
}
