import { createHash, timingSafeEqual } from "node:crypto";

export type Site = {
  id: string;
  domains: string[];
  outbound: string[];
  token: string;
};

const ID_PATTERN = /^[a-z0-9-]{1,32}$/;
const HOSTNAME_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
const MIN_TOKEN_LENGTH = 32;

function parseHostnames(
  value: unknown,
  field: string,
  at: string,
  { required }: { required: boolean },
): string[] {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || (required && value.length === 0)) {
    throw new Error(
      `ANALYTICS_SITES: ${at} ${field} must be a non-empty array`,
    );
  }
  for (const host of value) {
    if (typeof host !== "string" || !HOSTNAME_PATTERN.test(host)) {
      throw new Error(
        `ANALYTICS_SITES: ${at} ${field} has an invalid hostname (lowercase, no scheme, port or wildcard)`,
      );
    }
  }
  return value;
}

function parseSite(entry: unknown, index: number): Site {
  const at = `site[${index}]`;
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`ANALYTICS_SITES: ${at} must be an object`);
  }
  const { id, domains, outbound, token } = entry as Record<string, unknown>;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    throw new Error(`ANALYTICS_SITES: ${at} id must match ${ID_PATTERN}`);
  }
  if (typeof token !== "string" || token.length < MIN_TOKEN_LENGTH) {
    throw new Error(
      `ANALYTICS_SITES: ${at} token must be at least ${MIN_TOKEN_LENGTH} characters`,
    );
  }
  return {
    id,
    domains: parseHostnames(domains, "domains", at, { required: true }),
    outbound: parseHostnames(outbound, "outbound", at, { required: false }),
    token,
  };
}

export function parseSites(raw: string | undefined): Site[] {
  if (!raw) throw new Error("ANALYTICS_SITES is not set");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ANALYTICS_SITES is not valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("ANALYTICS_SITES must be a non-empty array");
  }
  const sites = parsed.map(parseSite);
  const ids = new Set<string>();
  for (const { id } of sites) {
    if (ids.has(id))
      throw new Error(`ANALYTICS_SITES: duplicate site id ${id}`);
    ids.add(id);
  }
  return sites;
}

export function findSite(sites: readonly Site[], id: string): Site | undefined {
  return sites.find((site) => site.id === id);
}

const digest = (value: string) => createHash("sha256").update(value).digest();

export function tokenMatches(
  site: Site,
  presented: string | null | undefined,
): boolean {
  if (typeof presented !== "string") return false;
  return timingSafeEqual(digest(site.token), digest(presented));
}

export function isPlausibleHost(site: Site, hostname: string): boolean {
  const host = hostname.toLowerCase();
  return site.domains.includes(host) || site.outbound.includes(host);
}
