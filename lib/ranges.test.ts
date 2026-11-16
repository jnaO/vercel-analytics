import { describe, expect, it } from "vitest";
import { dayKey } from "./keys";
import { daysInRange, parseRange, RANGES } from "./ranges";

describe("parseRange", () => {
  it("accepts the supported ranges", () => {
    expect(RANGES).toEqual([7, 30, 90]);
    expect(parseRange("7")).toBe(7);
    expect(parseRange("30")).toBe(30);
    expect(parseRange("90")).toBe(90);
  });

  it.each([undefined, null, "", "abc", "14", "7.5", "-7", ["7", "30"]])(
    "defaults to 30 for %j",
    (value) => {
      expect(parseRange(value)).toBe(30);
    },
  );
});

describe("daysInRange", () => {
  it("returns n UTC days ending today, oldest first", () => {
    const days = daysInRange(7, new Date("2026-03-04T23:59:59Z"));
    expect(days).toHaveLength(7);
    expect(days.map((d) => dayKey("s", d))).toEqual([
      "clicks:s:2026-02-26",
      "clicks:s:2026-02-27",
      "clicks:s:2026-02-28",
      "clicks:s:2026-03-01",
      "clicks:s:2026-03-02",
      "clicks:s:2026-03-03",
      "clicks:s:2026-03-04",
    ]);
  });

  it("moves to the next day at 00:00:00Z", () => {
    const days = daysInRange(7, new Date("2026-03-05T00:00:00Z"));
    expect(dayKey("s", days[6] as Date)).toBe("clicks:s:2026-03-05");
    expect(dayKey("s", days[0] as Date)).toBe("clicks:s:2026-02-27");
  });

  it("returns 90 distinct days", () => {
    const keys = daysInRange(90, new Date("2026-03-04T12:00:00Z")).map((d) =>
      dayKey("s", d),
    );
    expect(new Set(keys).size).toBe(90);
  });
});
