import { act, render, renderHook, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ConfirmDialogProvider, useConfirm } from "./use-confirm";

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  return <ConfirmDialogProvider>{children}</ConfirmDialogProvider>;
}

/** A test component that triggers confirm and stores the result */
function ConfirmTester() {
  const confirm = useConfirm();
  const [result, setResult] = React.useState<boolean | null>(null);

  return (
    <div>
      <button
        onClick={async () => {
          const confirmed = await confirm("Delete this?", {
            description: "This action cannot be undone.",
            confirmText: "Delete",
            cancelText: "Keep",
          });
          setResult(confirmed);
        }}
      >
        Trigger
      </button>
      {result !== null && <span data-testid="result">{String(result)}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useConfirm", () => {
  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useConfirm());
    }).toThrow("useConfirm must be used within a <ConfirmDialogProvider />");
  });

  it("returns a function when used inside provider", () => {
    const { result } = renderHook(() => useConfirm(), { wrapper });
    expect(typeof result.current).toBe("function");
  });

  it("confirm() returns a promise", () => {
    const { result } = renderHook(() => useConfirm(), { wrapper });

    let promise: Promise<boolean> | undefined;
    act(() => {
      promise = result.current("Are you sure?");
    });

    expect(promise).toBeInstanceOf(Promise);
  });

  it("opens dialog with title and description when confirm is called", async () => {
    render(
      <ConfirmDialogProvider>
        <ConfirmTester />
      </ConfirmDialogProvider>,
    );

    await act(async () => {
      screen.getByText("Trigger").click();
    });

    expect(screen.getByText("Delete this?")).toBeDefined();
    expect(screen.getByText("This action cannot be undone.")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
    expect(screen.getByText("Keep")).toBeDefined();
  });

  it("resolves true when confirm button is clicked", async () => {
    render(
      <ConfirmDialogProvider>
        <ConfirmTester />
      </ConfirmDialogProvider>,
    );

    await act(async () => {
      screen.getByText("Trigger").click();
    });

    await act(async () => {
      screen.getByText("Delete").click();
    });

    expect(screen.getByTestId("result").textContent).toBe("true");
  });

  it("resolves false when cancel button is clicked", async () => {
    render(
      <ConfirmDialogProvider>
        <ConfirmTester />
      </ConfirmDialogProvider>,
    );

    await act(async () => {
      screen.getByText("Trigger").click();
    });

    await act(async () => {
      screen.getByText("Keep").click();
    });

    expect(screen.getByTestId("result").textContent).toBe("false");
  });
});
