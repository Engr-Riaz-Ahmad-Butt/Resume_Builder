import { describe, expect, it } from "vite-plus/test";

import { getNetworkIcon } from "./network-icons";

describe("getNetworkIcon", () => {
  it("returns 'star' for undefined/empty", () => {
    expect(getNetworkIcon()).toBe("star");
    expect(getNetworkIcon(undefined)).toBe("star");
  });

  it("maps GitHub correctly", () => {
    expect(getNetworkIcon("GitHub")).toBe("github-logo");
    expect(getNetworkIcon("github")).toBe("github-logo");
  });

  it("maps LinkedIn correctly", () => {
    expect(getNetworkIcon("LinkedIn")).toBe("linkedin-logo");
  });

  it("maps Twitter and X.com", () => {
    expect(getNetworkIcon("Twitter")).toBe("twitter-logo");
    expect(getNetworkIcon("x.com")).toBe("twitter-logo");
  });

  it("maps other social networks", () => {
    expect(getNetworkIcon("Facebook")).toBe("facebook-logo");
    expect(getNetworkIcon("Instagram")).toBe("instagram-logo");
    expect(getNetworkIcon("YouTube")).toBe("youtube-logo");
    expect(getNetworkIcon("Medium")).toBe("medium-logo");
    expect(getNetworkIcon("Dribbble")).toBe("dribbble-logo");
    expect(getNetworkIcon("Behance")).toBe("behance-logo");
  });

  it("maps dev platforms", () => {
    expect(getNetworkIcon("StackOverflow")).toBe("stack-overflow-logo");
    expect(getNetworkIcon("Stack-Overflow")).toBe("stack-overflow-logo");
    expect(getNetworkIcon("dev.to")).toBe("code");
    expect(getNetworkIcon("devto")).toBe("code");
    expect(getNetworkIcon("GitLab")).toBe("git-branch");
    expect(getNetworkIcon("Bitbucket")).toBe("code");
    expect(getNetworkIcon("CodePen")).toBe("code");
  });

  it("is case-insensitive", () => {
    expect(getNetworkIcon("GITHUB")).toBe("github-logo");
    expect(getNetworkIcon("linkedin")).toBe("linkedin-logo");
  });

  it("returns 'star' for unknown networks", () => {
    expect(getNetworkIcon("MySpace")).toBe("star");
    expect(getNetworkIcon("Unknown")).toBe("star");
  });
});
