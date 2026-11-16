import { describe, expect, it } from "vitest";
import {
  findSite,
  isPlausibleHost,
  parseSites,
  type Site,
  tokenMatches,
} from "./sites";

const TOKEN_A = "a".repeat(32);
const TOKEN_B = "b".repeat(32);

const siteA = {
  id: "blog",
  domains: ["example.com", "www.example.com"],
  outbound: ["example.org"],
  token: TOKEN_A,
};
const siteB = {
  id: "shop-2",
  domains: ["example.net"],
  outbound: [],
  token: TOKEN_B,
};

const config = (value: unknown) => JSON.stringify(value);

describe("parseSites", () => {
  it("parses a valid config", () => {
    expect(parseSites(config([siteA, siteB]))).toEqual([siteA, siteB]);
  });

  it("defaults outbound to an empty list", () => {
    const { outbound: _omit, ...rest } = siteA;
    expect(parseSites(config([rest]))[0]?.outbound).toEqual([]);
  });

  it("throws when the config is missing", () => {
    expect(() => parseSites(undefined)).toThrow();
    expect(() => parseSites("")).toThrow();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseSites("{nope")).toThrow();
  });

  it("throws when the config is not a non-empty array", () => {
    expect(() => parseSites(config({}))).toThrow();
    expect(() => parseSites(config([]))).toThrow();
  });

  it("throws on duplicate site ids", () => {
    expect(() => parseSites(config([siteA, { ...siteB, id: "blog" }]))).toThrow(
      /duplicate/i,
    );
  });

  it.each(["", "Blog", "has space", "a".repeat(33), "under_score"])(
    "throws on invalid id %j",
    (id) => {
      expect(() => parseSites(config([{ ...siteA, id }]))).toThrow(/id/);
    },
  );

  it("throws on a token shorter than 32 characters", () => {
    expect(() =>
      parseSites(config([{ ...siteA, token: "a".repeat(31) }])),
    ).toThrow(/token/);
  });

  it("throws on a non-string token", () => {
    expect(() => parseSites(config([{ ...siteA, token: 12345 }]))).toThrow(
      /token/,
    );
  });

  it("throws when domains is empty or missing", () => {
    expect(() => parseSites(config([{ ...siteA, domains: [] }]))).toThrow(
      /domains/,
    );
    const { domains: _omit, ...rest } = siteA;
    expect(() => parseSites(config([rest]))).toThrow(/domains/);
  });

  it.each([
    "Example.com",
    "*.example.com",
    "https://example.com",
    "ex ample.com",
    "example.com:8080",
    "",
  ])("throws on invalid hostname %j", (host) => {
    expect(() => parseSites(config([{ ...siteA, domains: [host] }]))).toThrow(
      /hostname/,
    );
    expect(() => parseSites(config([{ ...siteA, outbound: [host] }]))).toThrow(
      /hostname/,
    );
  });
});

describe("findSite", () => {
  const sites = parseSites(config([siteA, siteB]));

  it("finds a site by id", () => {
    expect(findSite(sites, "shop-2")?.id).toBe("shop-2");
  });

  it("returns undefined for an unknown id", () => {
    expect(findSite(sites, "nope")).toBeUndefined();
    expect(findSite(sites, "")).toBeUndefined();
  });

  it("does not match inherited object keys", () => {
    expect(findSite(sites, "constructor")).toBeUndefined();
  });
});

describe("tokenMatches", () => {
  const site: Site = siteA;

  it("accepts the exact token", () => {
    expect(tokenMatches(site, TOKEN_A)).toBe(true);
  });

  it("rejects a different token of the same length", () => {
    expect(tokenMatches(site, `${"a".repeat(31)}c`)).toBe(false);
    expect(tokenMatches(site, TOKEN_B)).toBe(false);
  });

  it("rejects other lengths without throwing", () => {
    expect(tokenMatches(site, "")).toBe(false);
    expect(tokenMatches(site, "a")).toBe(false);
    expect(tokenMatches(site, `${TOKEN_A}x`)).toBe(false);
  });

  it("rejects a missing token", () => {
    expect(tokenMatches(site, undefined)).toBe(false);
    expect(tokenMatches(site, null)).toBe(false);
  });
});

describe("isPlausibleHost", () => {
  const site: Site = siteA;

  it("matches domains and outbound exactly", () => {
    expect(isPlausibleHost(site, "example.com")).toBe(true);
    expect(isPlausibleHost(site, "www.example.com")).toBe(true);
    expect(isPlausibleHost(site, "example.org")).toBe(true);
  });

  it("is case-insensitive on the presented hostname", () => {
    expect(isPlausibleHost(site, "EXAMPLE.org")).toBe(true);
  });

  it("rejects subdomains, parents and lookalikes", () => {
    expect(isPlausibleHost(site, "a.example.com")).toBe(false);
    expect(isPlausibleHost(site, "com")).toBe(false);
    expect(isPlausibleHost(site, "example.com.evil.test")).toBe(false);
    expect(isPlausibleHost(site, "notexample.com")).toBe(false);
    expect(isPlausibleHost(site, "")).toBe(false);
  });
});
