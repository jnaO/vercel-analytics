import { describe, expect, it } from "vitest";
import { normaliseHref, normaliseLabel, normalisePath } from "./normalise";
import type { Site } from "./sites";

const site: Site = {
  id: "blog",
  domains: ["example.com", "www.example.com"],
  outbound: ["example.org"],
  token: "t".repeat(32),
};

describe("normaliseHref", () => {
  it("strips query and fragment", () => {
    expect(normaliseHref("https://example.org/a?x=1&y=2#top", site)).toBe(
      "https://example.org/a",
    );
    expect(normaliseHref("https://example.org/a?", site)).toBe(
      "https://example.org/a",
    );
    expect(normaliseHref("https://example.org/a#", site)).toBe(
      "https://example.org/a",
    );
  });

  it("lowercases the host and keeps the path case", () => {
    expect(normaliseHref("HTTPS://EXAMPLE.org/Some/Path", site)).toBe(
      "https://example.org/Some/Path",
    );
  });

  it("drops the default port and keeps a non-default one", () => {
    expect(normaliseHref("https://example.org:443/a", site)).toBe(
      "https://example.org/a",
    );
    expect(normaliseHref("http://example.org:80/a", site)).toBe(
      "http://example.org/a",
    );
    expect(normaliseHref("https://example.org:8443/a", site)).toBe(
      "https://example.org:8443/a",
    );
  });

  it("drops userinfo", () => {
    expect(normaliseHref("https://user:pw@example.org/a", site)).toBe(
      "https://example.org/a",
    );
  });

  it("adds the root path for a bare origin", () => {
    expect(normaliseHref("https://example.org", site)).toBe(
      "https://example.org/",
    );
  });

  it.each([
    "javascript:alert(1)",
    "mailto:a@example.org",
    "tel:+100000",
    "data:text/html,hi",
    "ftp://example.org/a",
    "/relative/path",
    "//example.org/a",
    "not a url",
    "",
  ])("rejects %j", (raw) => {
    expect(normaliseHref(raw, site)).toBeNull();
  });

  it.each([
    "https://other.test/a",
    "https://a.example.org/",
    "https://example.com.evil.test/",
  ])("rejects the implausible host in %s", (raw) => {
    expect(normaliseHref(raw, site)).toBeNull();
  });

  it("accepts the site's own domains", () => {
    expect(normaliseHref("https://www.example.com/x", site)).toBe(
      "https://www.example.com/x",
    );
  });

  it("rejects non-string input", () => {
    expect(normaliseHref(undefined, site)).toBeNull();
    expect(normaliseHref(42, site)).toBeNull();
  });

  it("enforces the 512-character cap on the result", () => {
    const prefix = "https://example.org/";
    const ok = `${prefix}${"a".repeat(512 - prefix.length)}`;
    expect(ok).toHaveLength(512);
    expect(normaliseHref(ok, site)).toBe(ok);
    expect(normaliseHref(`${ok}a`, site)).toBeNull();
  });

  it("measures the cap after the query is stripped", () => {
    const raw = `https://example.org/a?${"q".repeat(1000)}`;
    expect(normaliseHref(raw, site)).toBe("https://example.org/a");
  });
});

describe("normalisePath", () => {
  it("keeps a plain pathname", () => {
    expect(normalisePath("/a/b")).toBe("/a/b");
    expect(normalisePath("/")).toBe("/");
  });

  it("strips query and fragment", () => {
    expect(normalisePath("/a/b?x=1#frag")).toBe("/a/b");
    expect(normalisePath("/?x=1")).toBe("/");
  });

  it.each([
    "a/b",
    "",
    "//evil.test/x",
    "https://example.com/a",
    "/a\tb",
    "/a\nb",
  ])("rejects %j", (raw) => {
    expect(normalisePath(raw)).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(normalisePath(undefined)).toBeNull();
    expect(normalisePath({})).toBeNull();
  });

  it("enforces the 256-character cap", () => {
    const ok = `/${"a".repeat(255)}`;
    expect(normalisePath(ok)).toBe(ok);
    expect(normalisePath(`${ok}a`)).toBeNull();
  });

  it("measures the cap after the query is stripped", () => {
    expect(normalisePath(`/a?${"q".repeat(1000)}`)).toBe("/a");
  });
});

describe("normaliseLabel", () => {
  it("trims and lowercases", () => {
    expect(normaliseLabel("  Header ")).toBe("header");
  });

  it("accepts slugs", () => {
    expect(normaliseLabel("cta_2-top")).toBe("cta_2-top");
    expect(normaliseLabel("a".repeat(32))).toBe("a".repeat(32));
  });

  it.each([
    "",
    "   ",
    "-lead",
    "_lead",
    "has space",
    "a@b.example",
    "https://example.com",
    "tab\tbed",
    "a".repeat(33),
    "ünï",
  ])("drops %j", (raw) => {
    expect(normaliseLabel(raw)).toBeUndefined();
  });

  it("drops non-string input", () => {
    expect(normaliseLabel(undefined)).toBeUndefined();
    expect(normaliseLabel(null)).toBeUndefined();
    expect(normaliseLabel(7)).toBeUndefined();
  });
});
