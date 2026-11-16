import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("ANALYTICS_COLLECTOR_URL", "https://collector.example");
  vi.stubEnv("ANALYTICS_SITE_ID", "demo");
  vi.stubEnv("ANALYTICS_TOKEN", "placeholder-token-placeholder-token-1234");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const body = JSON.stringify({
  path: "/page",
  href: "https://out.example/x",
  label: "header",
});

function req(headers: Record<string, string> = {}, payload: string = body) {
  return new Request("https://site.example/api/track", {
    method: "POST",
    headers: {
      host: "site.example",
      "content-type": "text/plain;charset=UTF-8",
      "user-agent": "Mozilla/5.0 Visitor",
      ...headers,
    },
    body: payload,
  });
}

describe("relay POST", () => {
  it("forwards the fields as JSON to the collector with auth and visitor UA", async () => {
    const res = await POST(req({ "sec-fetch-site": "same-origin" }));
    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://collector.example/api/hit");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe(
      ["Bear" + "er", "placeholder-token-placeholder-token-1234"].join(" "),
    );
    expect(headers.get("x-analytics-ua")).toBe("Mozilla/5.0 Visitor");
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({
      site: "demo",
      path: "/page",
      href: "https://out.example/x",
      label: "header",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("never forwards IP, forwarded-for, real-ip or cookie headers", async () => {
    await POST(
      req({
        "x-forwarded-for": "203.0.113.9",
        "x-real-ip": "203.0.113.9",
        cookie: "a=b",
        forwarded: "for=203.0.113.9",
      }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    for (const name of [
      "x-forwarded-for",
      "x-real-ip",
      "cookie",
      "forwarded",
    ]) {
      expect(headers.has(name)).toBe(false);
    }
    expect(JSON.stringify([...headers])).not.toContain("203.0.113.9");
    expect(init.body as string).not.toContain("203.0.113.9");
  });

  it("forwards only the string fields path, href and label", async () => {
    await POST(
      req(
        {},
        JSON.stringify({
          path: "/p",
          href: "https://out.example/",
          label: 5,
          site: "evil",
          extra: "x",
        }),
      ),
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      site: "demo",
      path: "/p",
      href: "https://out.example/",
    });
  });

  it("accepts Origin: null", async () => {
    const res = await POST(req({ origin: "null" }));
    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("accepts a same-host Origin and requests without Fetch Metadata", async () => {
    const res = await POST(req({ origin: "https://site.example" }));
    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["cross-site", { "sec-fetch-site": "cross-site" }],
    ["same-site", { "sec-fetch-site": "same-site" }],
    ["none", { "sec-fetch-site": "none" }],
    ["foreign Origin", { origin: "https://other.example" }],
  ])("rejects %s with 403 and never calls fetch", async (_n, headers) => {
    const res = await POST(req(headers));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed Origin as cross-site", async () => {
    const res = await POST(req({ origin: "not a url" }));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 413 over 2048 bytes without calling fetch", async () => {
    const big = JSON.stringify({ path: "/", href: "x".repeat(2100) });
    const res = await POST(req({}, big));
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("counts bytes, not characters, for the size limit", async () => {
    const big = JSON.stringify({ path: "/", href: "é".repeat(1100) });
    expect(big.length).toBeLessThan(2048);
    const res = await POST(req({}, big));
    expect(res.status).toBe(413);
  });

  it("returns 400 on invalid JSON or a non-object body", async () => {
    for (const bad of ["{nope", "[]", "null", '"s"']) {
      const res = await POST(req({}, bad));
      expect(res.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 204 when the collector responds with an error", async () => {
    fetchMock.mockResolvedValue(new Response("x", { status: 401 }));
    expect((await POST(req())).status).toBe(204);
  });

  it("returns 204 when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    expect((await POST(req())).status).toBe(204);
  });

  it("returns 204 without forwarding when env is missing", async () => {
    vi.stubEnv("ANALYTICS_TOKEN", "");
    expect((await POST(req())).status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never echoes the token in the response", async () => {
    const res = await POST(req());
    expect(await res.text()).toBe("");
    expect(JSON.stringify([...res.headers])).not.toContain("placeholder-token");
  });
});
