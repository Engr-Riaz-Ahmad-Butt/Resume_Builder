import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { useIsMobile } from "./use-mobile";

// ---------------------------------------------------------------------------
// Mock window.matchMedia
// ---------------------------------------------------------------------------

type MockMatchMedia = {
  matches: boolean;
  listeners: Array<(e: { matches: boolean }) => void>;
  trigger: (matches: boolean) => void;
};

let mockMql: MockMatchMedia;

beforeEach(() => {
  mockMql = {
    matches: false,
    listeners: [],
    trigger(matches: boolean) {
      this.matches = matches;
      for (const listener of this.listeners) {
        listener({ matches });
      }
    },
  };

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return mockMql.matches;
      },
      addEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
        mockMql.listeners.push(cb);
      },
      removeEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
        mockMql.listeners = mockMql.listeners.filter((l) => l !== cb);
      },
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIsMobile", () => {
  it("returns false on desktop-sized screens", () => {
    mockMql.matches = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true on mobile-sized screens", () => {
    mockMql.matches = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates when screen size changes to mobile", () => {
    mockMql.matches = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      mockMql.trigger(true);
    });

    expect(result.current).toBe(true);
  });

  it("updates when screen size changes to desktop", () => {
    mockMql.matches = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    act(() => {
      mockMql.trigger(false);
    });

    expect(result.current).toBe(false);
  });

  it("cleans up event listener on unmount", () => {
    mockMql.matches = false;
    const { unmount } = renderHook(() => useIsMobile());

    expect(mockMql.listeners).toHaveLength(1);
    unmount();
    expect(mockMql.listeners).toHaveLength(0);
  });

  it("uses 768px breakpoint (max-width: 767px)", () => {
    renderHook(() => useIsMobile());
    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
  });
});
