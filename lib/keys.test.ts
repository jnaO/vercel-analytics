import { describe, expect, it } from "vitest";
import {
  dayKey,
  decodeField,
  encodeField,
  FIELD_CAP,
  MAX_BODY_BYTES,
  TTL_SECONDS,
} from "./keys";

describe("constants", () => {
  it("matches the plan limits", () => {
    expect(MAX_BODY_BYTES).toBe(2048);
    expect(FIELD_CAP).toBe(2000);
    expect(TTL_SECONDS).toBe(100 * 24 * 60 * 60);
  });
});

describe("dayKey", () => {
  it("uses the UTC date just before midnight", () => {
    expect(dayKey("blog", new Date("2026-03-04T23:59:59Z"))).toBe(
      "clicks:blog:2026-03-04",
    );
  });

  it("rolls over at 00:00:00Z", () => {
    expect(dayKey("blog", new Date("2026-03-05T00:00:00Z"))).toBe(
      "clicks:blog:2026-03-05",
    );
  });

  it("ignores the local offset of the instant", () => {
    expect(dayKey("blog", new Date("2026-03-04T23:30:00-05:00"))).toBe(
      "clicks:blog:2026-03-05",
    );
  });
});

describe("encodeField / decodeField", () => {
  it("round-trips without a label", () => {
    const hit = { path: "/a", href: "https://example.org/x" };
    const field = encodeField(hit);
    expect(field).toBe("/a\thttps://example.org/x\t");
    expect(decodeField(field)).toEqual(hit);
  });

  it("round-trips with a label", () => {
    const hit = { path: "/a", href: "https://example.org/x", label: "footer" };
    const field = encodeField(hit);
    expect(field).toBe("/a\thttps://example.org/x\tfooter");
    expect(decodeField(field)).toEqual(hit);
  });

  it("returns null for a malformed field", () => {
    expect(decodeField("no-separators")).toBeNull();
    expect(decodeField("a\tb")).toBeNull();
    expect(decodeField("a\tb\tc\td")).toBeNull();
  });
});
