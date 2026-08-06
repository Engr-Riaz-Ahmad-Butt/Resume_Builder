import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { CircleNotchIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { match, P } from "ts-pattern";

import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";
import { stripHtml } from "@/utils/string";

import { ResumeContextMenu } from "../menus/context-menu";
import { BaseCard } from "./base-card";

type ResumeCardProps = {
  resume: RouterOutput["resume"]["list"][number];
};

export function ResumeCard({ resume }: ResumeCardProps) {
  const { i18n } = useLingui();

  const { data: screenshotData, isLoading } = useQuery(
    orpc.printer.getResumeScreenshot.queryOptions({ input: { id: resume.id } }),
  );
  const { data: resumeDetails } = useQuery({
    ...orpc.resume.getById.queryOptions({ input: { id: resume.id } }),
    enabled: !screenshotData?.url && !isLoading,
  });

  const updatedAt = useMemo(() => {
    return Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(resume.updatedAt);
  }, [i18n.locale, resume.updatedAt]);

  return (
    <ResumeContextMenu resume={resume}>
      <Link to="/builder/$resumeId" params={{ resumeId: resume.id }} className="cursor-default">
        <motion.div
          className="will-change-transform"
          whileHover={{ y: -2, scale: 1.005 }}
          whileTap={{ scale: 0.998 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <BaseCard title={resume.name} description={t`Last updated on ${updatedAt}`} tags={resume.tags}>
            {match({ isLoading, imageSrc: screenshotData?.url })
              .with({ isLoading: true }, () => (
                <div className="flex size-full items-center justify-center">
                  <CircleNotchIcon weight="thin" className="size-12 animate-spin" />
                </div>
              ))
              .with({ imageSrc: P.string }, ({ imageSrc }) => (
                <img
                  src={imageSrc}
                  alt={resume.name}
                  className={cn("size-full object-cover transition-all", resume.isLocked && "blur-xs")}
                />
              ))
              .otherwise(() =>
                resumeDetails ? <ResumeCardPreview resume={resumeDetails} /> : <ResumeCardEmptyState title={resume.name} />,
              )}

            <ResumeLockOverlay isLocked={resume.isLocked} />
          </BaseCard>
        </motion.div>
      </Link>
    </ResumeContextMenu>
  );
}

function ResumeLockOverlay({ isLocked }: { isLocked: boolean }) {
  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          key="resume-lock-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center will-change-[opacity]"
        >
          <div className="flex items-center justify-center rounded-full bg-popover p-6">
            <LockSimpleIcon weight="thin" className="size-12 opacity-60" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResumeCardPreview({ resume }: { resume: RouterOutput["resume"]["getById"] }) {
  const summary = stripHtml(resume.data.summary.content);
  const headline = resume.data.basics.headline.trim();
  const skills = resume.data.sections.skills.items.map((item) => item.name).filter(Boolean).slice(0, 4);
  const experience = resume.data.sections.experience.items
    .map((item) => `${item.position || item.company}${item.company ? ` · ${item.company}` : ""}`)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <div className="size-full bg-neutral-200 p-3 text-[10px] leading-tight text-neutral-900 dark:bg-neutral-100">
      <div className="mx-auto flex h-full w-full max-w-[170px] flex-col gap-2 overflow-hidden rounded-sm bg-white p-3 shadow-sm">
        <div className="border-b border-neutral-200 pb-2">
          <h4 className="truncate text-xs font-semibold">{resume.data.basics.name || resume.name}</h4>
          <p className="line-clamp-2 text-[9px] text-neutral-600">
            {headline || "Resume preview"}
          </p>
        </div>

        {summary && (
          <div className="space-y-1">
            <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Summary</div>
            <p className="line-clamp-4 text-[9px] text-neutral-700">{summary}</p>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-1">
            <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Experience</div>
            {experience.map((item) => (
              <p key={item} className="truncate text-[9px] text-neutral-700">
                {item}
              </p>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div className="mt-auto space-y-1">
            <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Skills</div>
            <div className="flex flex-wrap gap-1">
              {skills.map((skill) => (
                <span key={skill} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[8px] text-neutral-700">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResumeCardEmptyState({ title }: { title: string }) {
  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted via-muted/70 to-muted/40 p-6">
      <div className="w-full max-w-[170px] rounded-sm border border-border/60 bg-background/90 p-4 text-center shadow-sm">
        <h4 className="truncate text-sm font-medium">{title}</h4>
        <p className="mt-1 text-xs text-muted-foreground">Open the resume to start adding content.</p>
      </div>
    </div>
  );
}
