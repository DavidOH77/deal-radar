import { afterEach, describe, expect, it, vi } from "vitest";
import { algumonConnector } from "./algumon";

describe("algumonConnector", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stays disabled by default without requesting the unstable public list", async () => {
    vi.stubEnv("ENABLE_ALGUMON_PUBLIC_CRAWL", "0");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await algumonConnector.collect();

    expect(result.status).toBe("disabled");
    expect(result.count).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
