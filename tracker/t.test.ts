import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../public/t.js"), "utf8");

type Beacon = [string, string];

function load(body: string, scriptAttrs = "") {
  const beacons: Beacon[] = [];
  const dom = new JSDOM(`<!doctype html><body>${body}</body>`, {
    url: "https://site.example/page?x=1#h",
    runScripts: "outside-only",
  });
  const { window } = dom;
  Object.defineProperty(window.navigator, "sendBeacon", {
    value: (url: string, data: string) => {
      beacons.push([url, data]);
      return true;
    },
    configurable: true,
  });
  const script = window.document.createElement("script");
  for (const pair of scriptAttrs.split(" ").filter(Boolean)) {
    const [k, v] = pair.split("=");
    script.setAttribute(k as string, v ?? "");
  }
  window.document.body.appendChild(script);
  Object.defineProperty(window.document, "currentScript", {
    value: script,
    configurable: true,
  });
  window.eval(source);
  return { window, beacons };
}

function click(
  window: Window & typeof globalThis,
  el: Element,
  type: "click" | "auxclick",
  button: number,
) {
  el.dispatchEvent(
    new window.MouseEvent(type, { bubbles: true, cancelable: true, button }),
  );
}

describe("t.js", () => {
  it("beacons path, href and no label on a left click", () => {
    const { window, beacons } = load(
      '<a id="a" href="https://out.example/x?q=1">go</a>',
    );
    click(window, window.document.getElementById("a") as Element, "click", 0);
    expect(beacons).toHaveLength(1);
    expect(beacons[0]?.[0]).toBe("/api/track");
    expect(JSON.parse(beacons[0]?.[1] as string)).toEqual({
      path: "/page",
      href: "https://out.example/x?q=1",
    });
  });

  it("sends a string body so the beacon is text/plain", () => {
    const { window, beacons } = load(
      '<a id="a" href="https://o.example/">x</a>',
    );
    click(window, window.document.getElementById("a") as Element, "click", 0);
    expect(typeof beacons[0]?.[1]).toBe("string");
  });

  it("uses data-endpoint when set", () => {
    const { window, beacons } = load(
      '<a id="a" href="https://o.example/">x</a>',
      "data-endpoint=/custom/track",
    );
    click(window, window.document.getElementById("a") as Element, "click", 0);
    expect(beacons[0]?.[0]).toBe("/custom/track");
  });

  it("counts a middle click via auxclick", () => {
    const { window, beacons } = load(
      '<a id="a" href="https://o.example/">x</a>',
    );
    click(
      window,
      window.document.getElementById("a") as Element,
      "auxclick",
      1,
    );
    expect(beacons).toHaveLength(1);
  });

  it("ignores a right click (auxclick button 2)", () => {
    const { window, beacons } = load(
      '<a id="a" href="https://o.example/">x</a>',
    );
    click(
      window,
      window.document.getElementById("a") as Element,
      "auxclick",
      2,
    );
    expect(beacons).toHaveLength(0);
  });

  it("ignores a plain click event with a non-primary button", () => {
    const { window, beacons } = load(
      '<a id="a" href="https://o.example/">x</a>',
    );
    click(window, window.document.getElementById("a") as Element, "click", 2);
    expect(beacons).toHaveLength(0);
  });

  it("ignores mailto: links", () => {
    const { window, beacons } = load(
      '<a id="a" href="mailto:a@b.example">x</a>',
    );
    click(window, window.document.getElementById("a") as Element, "click", 0);
    expect(beacons).toHaveLength(0);
  });

  it("ignores clicks outside links", () => {
    const { window, beacons } = load("<p id='p'>text</p>");
    click(window, window.document.getElementById("p") as Element, "click", 0);
    expect(beacons).toHaveLength(0);
  });

  it("finds the nearest link from a nested element", () => {
    const { window, beacons } = load(
      '<a href="https://o.example/n"><span id="s">x</span></a>',
    );
    click(window, window.document.getElementById("s") as Element, "click", 0);
    expect(JSON.parse(beacons[0]?.[1] as string).href).toBe(
      "https://o.example/n",
    );
  });

  it("passes data-analytics-label through", () => {
    const { window, beacons } = load(
      '<a id="a" href="https://o.example/" data-analytics-label="Header">x</a>',
    );
    click(window, window.document.getElementById("a") as Element, "click", 0);
    expect(JSON.parse(beacons[0]?.[1] as string).label).toBe("Header");
  });

  it("skips SVG anchors", () => {
    const { window, beacons } = load(
      '<svg><a id="a" href="https://o.example/"><text>x</text></a></svg>',
    );
    click(window, window.document.getElementById("a") as Element, "click", 0);
    expect(beacons).toHaveLength(0);
  });

  it("does nothing when sendBeacon is missing", () => {
    const dom = new JSDOM('<a id="a" href="https://o.example/">x</a>', {
      url: "https://site.example/",
      runScripts: "outside-only",
    });
    dom.window.eval(source);
    const a = dom.window.document.getElementById("a") as Element;
    expect(() => click(dom.window as never, a, "click", 0)).not.toThrow();
  });

  it("touches no cookie or storage", () => {
    const { window, beacons } = load(
      '<a id="a" href="https://o.example/">x</a>',
    );
    click(window, window.document.getElementById("a") as Element, "click", 0);
    expect(beacons).toHaveLength(1);
    expect(window.document.cookie).toBe("");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(source).not.toMatch(/cookie|localStorage|sessionStorage/);
  });
});
