import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { Link, LinkStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const LINKS_PATH = path.join(DATA_DIR, "links.json");
const TMP_PATH = path.join(DATA_DIR, "links.tmp.json");

const EMPTY_STORE: LinkStore = { links: [] };

export async function readLinkStore(): Promise<LinkStore> {
  try {
    const raw = await fs.readFile(LINKS_PATH, "utf-8");
    const parsed: LinkStore = JSON.parse(raw);
    // Defensive: ensure shape
    if (!parsed || !Array.isArray(parsed.links)) {
      return { ...EMPTY_STORE };
    }
    return parsed;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(LINKS_PATH, JSON.stringify(EMPTY_STORE));
      return { ...EMPTY_STORE };
    }
    console.error("Failed to parse links.json, resetting:", err);
    await fs.writeFile(LINKS_PATH, JSON.stringify(EMPTY_STORE));
    return { ...EMPTY_STORE };
  }
}

export async function writeLinkStore(store: LinkStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(store, null, 2));
  await fs.rename(TMP_PATH, LINKS_PATH);
}

export interface AddLinkInput {
  memo: string;
  urls: string[];
  primaryDomain: string;
  source: "telegram" | "manual";
  telegramMessageId?: number;
}

/** Append a new Link to the store and return the created record. */
export async function addLink(input: AddLinkInput): Promise<Link> {
  const store = await readLinkStore();
  const link: Link = {
    id: uuidv4(),
    memo: input.memo,
    urls: input.urls,
    primaryDomain: input.primaryDomain,
    read: false,
    source: input.source,
    telegramMessageId: input.telegramMessageId,
    createdAt: new Date().toISOString(),
  };
  store.links.push(link);
  await writeLinkStore(store);
  return link;
}

/** Look up a link by Telegram message id (used for dedupe). */
export async function findByTelegramMessageId(
  messageId: number
): Promise<Link | undefined> {
  const store = await readLinkStore();
  return store.links.find((l) => l.telegramMessageId === messageId);
}
