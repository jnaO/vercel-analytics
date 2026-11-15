export const MAX_BODY_BYTES = 2048;
export const FIELD_CAP = 2000;
export const TTL_SECONDS = 100 * 24 * 60 * 60;

const SEPARATOR = "\t";

export type Hit = { path: string; href: string; label?: string };

export function dayKey(site: string, date: Date): string {
  return `clicks:${site}:${date.toISOString().slice(0, 10)}`;
}

export function encodeField({ path, href, label }: Hit): string {
  return [path, href, label ?? ""].join(SEPARATOR);
}

export function decodeField(field: string): Hit | null {
  const parts = field.split(SEPARATOR);
  if (parts.length !== 3) return null;
  const [path, href, label] = parts as [string, string, string];
  return label === "" ? { path, href } : { path, href, label };
}
