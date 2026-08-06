import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@lingui/core/macro", () => ({
  t: (strings: TemplateStringsArray) => strings[0],
}));

import { PromptDialogProvider, usePrompt } from "./use-prompt";

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  return <PromptDialogProvider>{children}</PromptDialogProvider>;
}

function PromptTester() {
  const prompt = usePrompt();
  const [result, setResult] = React.useState<string | null | undefined>(undefined);

  return (
    <div>
      <button
        onClick={async () => {
          const value = await prompt("Enter name", {
            description: "Provide your full name",
            defaultValue: "John",
            confirmText: "Submit",
            cancelText: "Skip",
          });
          setResult(value);
        }}
      >
        Open Prompt
      </button>
      {result !== undefined && <span data-testid="result">{result === null ? "null" : result}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePrompt", () => {
  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => usePrompt());
    }).toThrow("usePrompt must be used within a <PromptDialogProvider />");
  });

  it("returns a function when used inside provider", () => {
    const { result } = renderHook(() => usePrompt(), { wrapper });
    expect(typeof result.current).toBe("function");
  });

  it("prompt() returns a promise", () => {
    const { result } = renderHook(() => usePrompt(), { wrapper });

    let promise: Promise<string | null> | undefined;
    act(() => {
      promise = result.current("Enter value");
    });

    expect(promise).toBeInstanceOf(Promise);
  });

  it("opens dialog with title, description, and default value", async () => {
    render(
      <PromptDialogProvider>
        <PromptTester />
      </PromptDialogProvider>,
    );

    await act(async () => {
      screen.getByText("Open Prompt").click();
    });

    expect(screen.getByText("Enter name")).toBeDefined();
    expect(screen.getByText("Provide your full name")).toBeDefined();
    expect(screen.getByText("Submit")).toBeDefined();
    expect(screen.getByText("Skip")).toBeDefined();

    // Check default value in input
    const input = screen.getByDisplayValue("John");
    expect(input).toBeDefined();
  });

  it("resolves with input value when confirm is clicked", async () => {
    render(
      <PromptDialogProvider>
        <PromptTester />
      </PromptDialogProvider>,
    );

    await act(async () => {
      screen.getByText("Open Prompt").click();
    });

    // Change the input value
    const input = screen.getByDisplayValue("John");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Jane Doe" } });
    });

    await act(async () => {
      screen.getByText("Submit").click();
    });

    expect(screen.getByTestId("result").textContent).toBe("Jane Doe");
  });

  it("resolves with null when cancel is clicked", async () => {
    render(
      <PromptDialogProvider>
        <PromptTester />
      </PromptDialogProvider>,
    );

    await act(async () => {
      screen.getByText("Open Prompt").click();
    });

    await act(async () => {
      screen.getByText("Skip").click();
    });

    expect(screen.getByTestId("result").textContent).toBe("null");
  });

  it("resolves with value when Enter key is pressed", async () => {
    render(
      <PromptDialogProvider>
        <PromptTester />
      </PromptDialogProvider>,
    );

    await act(async () => {
      screen.getByText("Open Prompt").click();
    });

    const input = screen.getByDisplayValue("John");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Enter User" } });
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(screen.getByTestId("result").textContent).toBe("Enter User");
  });
});
