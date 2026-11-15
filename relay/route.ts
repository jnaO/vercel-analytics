/**
 * Drop-in click relay. Copy this single file into a client site as
 * `app/api/track/route.ts`. It has no dependencies.
 *
 * Environment variables (server-side only):
 *   ANALYTICS_COLLECTOR_URL  base URL of the collector, no trailing path
 *   ANALYTICS_SITE_ID        this site's id in the collector's ANALYTICS_SITES
 *   ANALYTICS_TOKEN          this site's token in the collector's ANALYTICS_SITES
 *
 * Keep MAX_BODY_BYTES equal to lib/keys.ts.
 */

const MAX_BODY_BYTES = 2048;
const TIMEOUT_MS = 3000;
const STRING_FIELDS = ["path", "href", "label"] as const;

const status = (code: number) => new Response(null, { status: code });

function isCrossSite(req: Request): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") return true;
  const origin = req.headers.get("origin");
  if (origin === null || origin === "null") return false;
  const host = req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

function pickFields(raw: string): Record<string, string> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const source = parsed as Record<string, unknown>;
  const fields: Record<string, string> = {};
  for (const name of STRING_FIELDS) {
    const value = source[name];
    if (typeof value === "string") fields[name] = value;
  }
  return fields;
}

export async function POST(req: Request): Promise<Response> {
  if (isCrossSite(req)) return status(403);

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return status(413);
  const fields = pickFields(raw);
  if (!fields) return status(400);

  const collector = process.env.ANALYTICS_COLLECTOR_URL;
  const site = process.env.ANALYTICS_SITE_ID;
  const token = process.env.ANALYTICS_TOKEN;
  if (!collector || !site || !token) return status(204);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
  const ua = req.headers.get("user-agent");
  if (ua) headers["x-analytics-ua"] = ua;

  try {
    await fetch(`${collector}/api/hit`, {
      method: "POST",
      headers,
      body: JSON.stringify({ site, ...fields }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // The beacon is fire-and-forget; upstream failures are not surfaced.
  }
  return status(204);
}
