import type React from "react";
import type { Layout } from "react-resizable-panels";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { useEffect, useRef } from "react";
import { usePanelRef } from "react-resizable-panels";

import { LoadingScreen } from "@/components/layout/loading-screen";
import { useCSSVariables } from "@/components/resume/hooks/use-css-variables";
import { useResumeStore } from "@/components/resume/store/resume";
import { ResizableGroup, ResizablePanel, ResizableSeparator } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { orpc } from "@/integrations/orpc/client";

import { BuilderHeader } from "./-components/header";
import { BuilderSidebarLeft } from "./-sidebar/left";
import { BuilderSidebarRight } from "./-sidebar/right";
import {
  BUILDER_LAYOUT_COOKIE_NAME,
  DEFAULT_BUILDER_LAYOUT,
  mapPanelLayoutToBuilderLayout,
  parseBuilderLayoutCookie,
  useBuilderSidebar,
  useBuilderSidebarStore,
  type BuilderLayout,
} from "./-store/sidebar";

export const Route = createFileRoute("/builder/$resumeId")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    if (!context.session) throw redirect({ to: "/auth/login", replace: true });
    return { session: context.session };
  },
  loader: async ({ params, context }) => {
    const [layout, resume] = await Promise.all([
      getBuilderLayoutServerFn(),
      context.queryClient.ensureQueryData(orpc.resume.getById.queryOptions({ input: { id: params.resumeId } })),
    ]);

    return { layout, name: resume.name };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.name} - Reactive Resume` }] : undefined,
  }),
});

function RouteComponent() {
  const { layout: initialLayout } = Route.useLoaderData();

  const { resumeId } = Route.useParams();
  const { data: resume } = useSuspenseQuery(orpc.resume.getById.queryOptions({ input: { id: resumeId } }));

  const style = useCSSVariables(resume.data);
  const isReady = useResumeStore((state) => state.isReady);
  const initialize = useResumeStore((state) => state.initialize);

  useEffect(() => {
    initialize(resume);
    return () => initialize(null);
  }, [resume, initialize]);

  if (!isReady) return <LoadingScreen />;

  return <BuilderLayout style={style} initialLayout={initialLayout} />;
}

type BuilderLayoutProps = React.ComponentProps<"div"> & {
  initialLayout: BuilderLayout;
};

function BuilderLayout({ initialLayout, ...props }: BuilderLayoutProps) {
  const isMobile = useIsMobile();
  const canPersistLayoutRef = useRef(false);

  const leftSidebarRef = usePanelRef();
  const rightSidebarRef = usePanelRef();

  const setLeftSidebar = useBuilderSidebarStore((state) => state.setLeftSidebar);
  const setRightSidebar = useBuilderSidebarStore((state) => state.setRightSidebar);
  const setLayout = useBuilderSidebarStore((state) => state.setLayout);

  const { maxSidebarSize, collapsedSidebarSize } = useBuilderSidebar((state) => ({
    maxSidebarSize: state.maxSidebarSize,
    collapsedSidebarSize: state.collapsedSidebarSize,
  }));

  useEffect(() => {
    setLayout(initialLayout);
    canPersistLayoutRef.current = true;
  }, [initialLayout, setLayout]);

  const onLayoutChanged = (layout: Layout) => {
    const nextLayout = mapPanelLayoutToBuilderLayout(layout);
    if (!canPersistLayoutRef.current) return;
    setLayout(nextLayout);
    void setBuilderLayoutServerFn({ data: nextLayout });
  };

  useEffect(() => {
    if (!leftSidebarRef || !rightSidebarRef) return;

    setLeftSidebar(leftSidebarRef);
    setRightSidebar(rightSidebarRef);
  }, [leftSidebarRef, rightSidebarRef, setLeftSidebar, setRightSidebar]);

  const sidebarMinSize = isMobile ? "0%" : `${collapsedSidebarSize * 2}px`;
  const sidebarCollapsedSize = isMobile ? "0%" : `${collapsedSidebarSize}px`;
  const leftSidebarSize = isMobile ? "0%" : `${initialLayout.left}%`;
  const rightSidebarSize = isMobile ? "0%" : `${initialLayout.right}%`;
  const artboardSize = isMobile ? "100%" : `${initialLayout.artboard}%`;

  return (
    <div className="flex h-svh flex-col" {...props}>
      <BuilderHeader />

      <ResizableGroup orientation="horizontal" className="mt-14 flex-1" onLayoutChanged={onLayoutChanged}>
        <ResizablePanel
          collapsible
          id="left"
          panelRef={leftSidebarRef}
          maxSize={maxSidebarSize}
          minSize={sidebarMinSize}
          collapsedSize={sidebarCollapsedSize}
          defaultSize={leftSidebarSize}
          className="z-20 h-[calc(100svh-3.5rem)]"
        >
          <BuilderSidebarLeft />
        </ResizablePanel>
        <ResizableSeparator withHandle className="z-50 border-s" />
        <ResizablePanel id="artboard" defaultSize={artboardSize} className="h-[calc(100svh-3.5rem)]">
          <Outlet />
        </ResizablePanel>
        <ResizableSeparator withHandle className="z-50 border-e" />
        <ResizablePanel
          collapsible
          id="right"
          panelRef={rightSidebarRef}
          maxSize={maxSidebarSize}
          minSize={sidebarMinSize}
          collapsedSize={sidebarCollapsedSize}
          defaultSize={rightSidebarSize}
          className="z-20 h-[calc(100svh-3.5rem)]"
        >
          <BuilderSidebarRight />
        </ResizablePanel>
      </ResizableGroup>
    </div>
  );
}

const setBuilderLayoutServerFn = createServerFn({ method: "POST" })
  .inputValidator((data): BuilderLayout => parseBuilderLayoutCookie(JSON.stringify(data)))
  .handler(async ({ data }) => {
    setCookie(BUILDER_LAYOUT_COOKIE_NAME, JSON.stringify(data), { path: "/" });
  });

const getBuilderLayoutServerFn = createServerFn({ method: "GET" }).handler(async (): Promise<BuilderLayout> => {
  const layout = getCookie(BUILDER_LAYOUT_COOKIE_NAME);
  if (!layout) return DEFAULT_BUILDER_LAYOUT;
  return parseBuilderLayoutCookie(layout);
});
