import { isPlausibleHost, type Site } from "./sites";

const MAX_HREF_LENGTH = 512;
const MAX_PATH_LENGTH = 256;
const LABEL_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: rejects control characters, including the field separator
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function normaliseHref(raw: unknown, site: Site): string | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!isPlausibleHost(site, url.hostname)) return null;
  const href = `${url.protocol}//${url.host}${url.pathname}`;
  return href.length <= MAX_HREF_LENGTH ? href : null;
}

export function normalisePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.split(/[?#]/, 1)[0] as string;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (CONTROL_CHARS.test(path)) return null;
  return path.length <= MAX_PATH_LENGTH ? path : null;
}

export function normaliseLabel(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const label = raw.trim().toLowerCase();
  return LABEL_PATTERN.test(label) ? label : undefined;
}
