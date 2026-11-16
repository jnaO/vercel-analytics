import { describe, expect, it } from "vitest";
import { isBot } from "./bots";

const BROWSERS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

const BOTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 (compatible; YandexBot/3.0)",
  "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
  "Mozilla/5.0 (compatible; Baiduspider/2.0)",
  "DuckDuckBot/1.1",
  "Slackbot-LinkExpanding 1.0",
  "facebookexternalhit/1.1",
  "Twitterbot/1.0",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Unknown; Linux x86_64) PhantomJS/2.1.1",
  "Mozilla/5.0 (X11; Linux x86_64) Lighthouse",
  "Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)",
  "Pingdom.com_bot_version_1.4",
  "curl/8.4.0",
  "Wget/1.21.3",
  "python-requests/2.31.0",
  "Python-urllib/3.11",
  "Go-http-client/2.0",
  "axios/1.6.0",
  "node-fetch/1.0",
  "okhttp/4.12.0",
  "Java/17.0.1",
  "libwww-perl/6.67",
  "Scrapy/2.11",
];

describe("isBot", () => {
  it.each([undefined, null, "", "   "])("treats %j as a bot", (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it.each(BOTS)("flags %s", (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it.each(BROWSERS)("passes %s", (ua) => {
    expect(isBot(ua)).toBe(false);
  });
});
