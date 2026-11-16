const BOT_PATTERN = new RegExp(
  [
    "bot\\b",
    "bot[/ ;_-]",
    "crawl",
    "spider",
    "slurp",
    "headless",
    "phantomjs",
    "lighthouse",
    "facebookexternalhit",
    "robot",
    "monitor",
    "uptime",
    "pingdom",
    "preview",
    "scrapy",
    "^curl/",
    "^wget/",
    "python",
    "^go-http-client",
    "^axios",
    "^node-fetch",
    "^okhttp",
    "^java/",
    "libwww",
    "httpclient",
  ].join("|"),
  "i",
);

export function isBot(ua: string | null | undefined): boolean {
  const trimmed = ua?.trim();
  return !trimmed || BOT_PATTERN.test(trimmed);
}
