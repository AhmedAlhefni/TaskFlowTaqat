import { afterEach, describe, expect, it, vi } from "vitest";
import "./setup";
import { readAppRoute } from "@/src/hooks/useAppRouting";

describe("readAppRoute", () => {
  afterEach(() => vi.unstubAllGlobals());

  const readAt = (pathname: string, hash = "") => {
    vi.stubGlobal("window", { location: { pathname, hash } });
    return readAppRoute();
  };

  it("shows the not-found route for an unknown path", () => {
    expect(readAt("/this-page-does-not-exist").view).toBe("not-found");
  });

  it("keeps the root and known application routes", () => {
    expect(readAt("/").view).toBe("dashboard");
    expect(readAt("/projects").view).toBe("projects");
    expect(readAt("/my-tasks").view).toBe("my-tasks");
    expect(readAt("/projects/example-id").projectId).toBe("example-id");
  });

  it("keeps login and registration as authentication routes", () => {
    expect(readAt("/login").authMode).toBe("login");
    expect(readAt("/register").authMode).toBe("register");
  });

  it("treats malformed project URLs as not found", () => {
    expect(readAt("/projects/%E0%A4%A").view).toBe("not-found");
  });
});
