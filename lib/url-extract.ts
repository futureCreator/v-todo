// lib/url-extract.ts — Extract URLs from Telegram messages.

/** Subset of Telegram message entity we care about. */
export interface TelegramEntity {
  type: string;
  offset: number;
  length: number;
}

const URL_REGEX = /https?:\/\/[^\s]+/g;
// Trailing characters that are almost never part of a real URL when caught at the end.
const TRAILING_TRIM = /[.,;:!?)\]}>'"`]+$/;

function trimTrailing(url: string): string {
  return url.replace(TRAILING_TRIM, "");
}

function dedupePreserveOrder(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * Extract URLs from a Telegram message.
 *
 * If entities are provided, only `type === "url"` slices are used. Otherwise,
 * a regex scans the raw text. Results have trailing punctuation stripped and
 * duplicates removed (first occurrence wins).
 */
export function extractUrls(
  text: string,
  entities: TelegramEntity[] | undefined
): string[] {
  if (!text) return [];

  let raw: string[];

  if (entities && entities.length > 0) {
    raw = entities
      .filter((e) => e.type === "url")
      .map((e) => text.slice(e.offset, e.offset + e.length));
  } else {
    raw = Array.from(text.matchAll(URL_REGEX), (m) => m[0]);
  }

  return dedupePreserveOrder(raw.map(trimTrailing).filter((u) => u.length > 0));
}
