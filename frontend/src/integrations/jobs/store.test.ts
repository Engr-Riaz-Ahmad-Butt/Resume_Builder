import { afterEach, describe, expect, it } from "vite-plus/test";

import { useJobsStore } from "./store";

afterEach(() => {
  useJobsStore.getState().reset();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("Jobs Store — initial state", () => {
  it("starts with default values", () => {
    const state = useJobsStore.getState();
    expect(state.rapidApiKey).toBe("");
    expect(state.testStatus).toBe("unverified");
    expect(state.rapidApiQuota).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// set()
// ---------------------------------------------------------------------------

describe("Jobs Store — set()", () => {
  it("updates rapidApiKey", () => {
    useJobsStore.getState().set((draft) => {
      draft.rapidApiKey = "new-api-key";
    });
    expect(useJobsStore.getState().rapidApiKey).toBe("new-api-key");
  });

  it("resets testStatus to unverified when rapidApiKey changes", () => {
    useJobsStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    useJobsStore.getState().set((draft) => {
      draft.rapidApiKey = "different-key";
    });
    expect(useJobsStore.getState().testStatus).toBe("unverified");
  });

  it("does NOT reset testStatus when rapidApiKey stays the same", () => {
    useJobsStore.getState().set((draft) => {
      draft.rapidApiKey = "same-key";
    });
    useJobsStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    // Change something else, keep the same key
    useJobsStore.getState().set((draft) => {
      draft.rapidApiQuota = { used: 10, limit: 100, remaining: 90 };
    });
    expect(useJobsStore.getState().testStatus).toBe("success");
  });

  it("updates rapidApiQuota", () => {
    const quota = { used: 50, limit: 100, remaining: 50 };
    useJobsStore.getState().set((draft) => {
      draft.rapidApiQuota = quota;
    });
    expect(useJobsStore.getState().rapidApiQuota).toEqual(quota);
  });

  it("updates testStatus directly", () => {
    useJobsStore.getState().set((draft) => {
      draft.testStatus = "failure";
    });
    expect(useJobsStore.getState().testStatus).toBe("failure");
  });
});

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe("Jobs Store — reset()", () => {
  it("restores all state to initial values", () => {
    useJobsStore.getState().set((draft) => {
      draft.rapidApiKey = "some-key";
      draft.testStatus = "success";
      draft.rapidApiQuota = { used: 10, limit: 100, remaining: 90 };
    });

    useJobsStore.getState().reset();

    const state = useJobsStore.getState();
    expect(state.rapidApiKey).toBe("");
    expect(state.testStatus).toBe("unverified");
    expect(state.rapidApiQuota).toBeNull();
  });
});
