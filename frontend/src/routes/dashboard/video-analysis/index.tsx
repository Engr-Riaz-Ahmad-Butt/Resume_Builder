import { Trans } from "@lingui/react/macro";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  SpinnerIcon,
  UploadSimpleIcon,
  VideoCameraIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/integrations/orpc/client";

import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/video-analysis/")({
  component: VideoAnalysisPage,
});

type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

function StatusBadge({ status }: { status: string }) {
  const s = status as AnalysisStatus;
  if (s === "completed")
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
        <CheckCircleIcon className="mr-1 size-3" />
        <Trans>Completed</Trans>
      </Badge>
    );
  if (s === "processing")
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
        <SpinnerIcon className="mr-1 size-3 animate-spin" />
        <Trans>Processing</Trans>
      </Badge>
    );
  if (s === "failed")
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/30">
        <WarningCircleIcon className="mr-1 size-3" />
        <Trans>Failed</Trans>
      </Badge>
    );
  return <Badge variant="secondary"><Trans>Pending</Trans></Badge>;
}

function ScoreBar({ label, value }: { label: string; value: string | number | null }) {
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

function AnalysisResults({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    ...orpc.video.getStatus.queryOptions({ input: { id } }),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "processing" || status === "pending" ? 3000 : false;
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return null;

  const detail = data.detailedAnalysis as Record<string, unknown> | null;
  const breakdown = detail?.score_breakdown as Record<string, string> | undefined;
  const strengths = detail?.strengths as string[] | undefined;
  const weaknesses = detail?.weaknesses as string[] | undefined;
  const suggestions = detail?.final_suggestion as string[] | undefined;

  return (
    <div className="space-y-6 rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold"><Trans>Analysis Results</Trans></h3>
          <p className="text-sm text-muted-foreground">
            {data.processedAt ? new Date(data.processedAt).toLocaleString() : ""}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {data.status === "processing" && (
        <Alert>
          <SpinnerIcon className="size-4 animate-spin" />
          <AlertTitle><Trans>Analyzing your video…</Trans></AlertTitle>
          <AlertDescription>
            <Trans>This usually takes 1–3 minutes. The page refreshes automatically.</Trans>
          </AlertDescription>
        </Alert>
      )}

      {data.status === "failed" && (
        <Alert variant="destructive">
          <WarningCircleIcon className="size-4" />
          <AlertTitle><Trans>Analysis failed</Trans></AlertTitle>
          <AlertDescription>{data.errorMessage ?? <Trans>An unknown error occurred.</Trans>}</AlertDescription>
        </Alert>
      )}

      {data.status === "completed" && (
        <>
          {/* Overall score */}
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-full border-4 border-primary text-2xl font-bold">
              {data.overallScore !== null ? `${Math.round(data.overallScore!)}` : "–"}
            </div>
            <div>
              <p className="text-sm text-muted-foreground"><Trans>Overall Score</Trans></p>
              <p className="text-xs text-muted-foreground">
                {typeof detail?.overall_comment === "string" ? detail.overall_comment : ""}
              </p>
            </div>
          </div>

          <Separator />

          {/* Category scores */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Trans>Category Scores</Trans>
            </h4>
            <ScoreBar label="Professionalism" value={data.professionalism} />
            <ScoreBar label="Energy Level" value={data.energyLevels} />
            <ScoreBar label="Communication" value={data.communication} />
            <ScoreBar label="Sociability" value={data.sociability} />
          </div>

          {breakdown && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Trans>Detailed Breakdown</Trans>
                </h4>
                {Object.entries(breakdown).map(([key, val]) => (
                  <ScoreBar key={key} label={key.replace(/_/g, " ")} value={val} />
                ))}
              </div>
            </>
          )}

          {strengths && strengths.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Trans>Strengths</Trans>
                </h4>
                <ul className="space-y-1">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-green-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {weaknesses && weaknesses.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Trans>Areas to Improve</Trans>
                </h4>
                <ul className="space-y-1">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {suggestions && suggestions.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Trans>Suggestions</Trans>
                </h4>
                <ol className="space-y-1 list-decimal list-inside">
                  {suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{s}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function VideoAnalysisPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  const { data: latestAnalysis, isLoading: latestLoading } = useQuery(
    orpc.video.getLatest.queryOptions(),
  );

  const uploadMutation = useMutation({
    ...orpc.video.upload.mutationOptions(),
    onSuccess: (result) => {
      setActiveAnalysisId(result.id);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: orpc.video.list.queryOptions().queryKey });
      toast.success("Video uploaded! Analysis is running in the background.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  function handleUpload() {
    if (selectedFile) uploadMutation.mutate(selectedFile);
  }

  const displayId = activeAnalysisId ?? (latestAnalysis?.id ?? null);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Video Analysis" icon={VideoCameraIcon} />

      {/* Upload section */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-base font-semibold"><Trans>Upload Video</Trans></h2>
        <p className="text-sm text-muted-foreground">
          <Trans>Supported formats: MP4, WebM, MOV, MKV. Max size: 200MB.</Trans>
        </p>

        <div
          className="flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-10 text-center cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <VideoCameraIcon className="size-10 text-muted-foreground" />
          {selectedFile ? (
            <p className="text-sm font-medium">{selectedFile.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Trans>Click to select a video file</Trans>
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <SpinnerIcon className="mr-2 size-4 animate-spin" />
            ) : (
              <UploadSimpleIcon className="mr-2 size-4" />
            )}
            <Trans>Analyze Video</Trans>
          </Button>

          {displayId && (
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: orpc.video.getStatus.queryOptions({ input: { id: displayId } }).queryKey })}
            >
              <ArrowClockwiseIcon className="mr-2 size-4" />
              <Trans>Refresh</Trans>
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {latestLoading && <Skeleton className="h-48 w-full" />}
      {!latestLoading && !displayId && (
        <Alert>
          <VideoCameraIcon className="size-4" />
          <AlertTitle><Trans>No video analyses yet</Trans></AlertTitle>
          <AlertDescription>
            <Trans>Upload a video above to get started.</Trans>
          </AlertDescription>
        </Alert>
      )}
      {displayId && <AnalysisResults id={displayId} />}
    </div>
  );
}
