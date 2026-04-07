import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import {
  readLinkStore,
  writeLinkStore,
  addLink,
  findByTelegramMessageId,
  LINKS_PATH,
} from "../link-store";
import { DATA_DIR } from "../store";
import type { Link } from "@/types";

const TMP_PATH = path.join(DATA_DIR, "links.tmp.json");

function makeLink(overrides: Partial<Link> = {}): Link {
  return {
    id: "link-1",
    memo: "예시 메모 https://example.com #tag",
    urls: ["https://example.com"],
    primaryDomain: "example.com",
    read: false,
    source: "telegram",
    telegramMessageId: 100,
    createdAt: "2026-04-07T00:00:00.000Z",
    ...overrides,
  };
}

describe("link-store", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LINKS_PATH, JSON.stringify({ links: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(LINKS_PATH); } catch {}
    try { await fs.unlink(TMP_PATH); } catch {}
  });

  it("reads an empty store", async () => {
    const store = await readLinkStore();
    expect(store.links).toEqual([]);
    expect(store.lastUpdateId).toBeUndefined();
  });

  it("writes and reads a link", async () => {
    const link = makeLink({ memo: "테스트" });
    await writeLinkStore({ links: [link] });
    const store = await readLinkStore();
    expect(store.links).toHaveLength(1);
    expect(store.links[0].memo).toBe("테스트");
  });

  it("persists lastUpdateId", async () => {
    await writeLinkStore({ links: [], lastUpdateId: 42 });
    const store = await readLinkStore();
    expect(store.lastUpdateId).toBe(42);
  });

  it("creates the file if it does not exist", async () => {
    await fs.unlink(LINKS_PATH);
    const store = await readLinkStore();
    expect(store.links).toEqual([]);
  });

  it("recovers from a corrupted file", async () => {
    await fs.writeFile(LINKS_PATH, "not json");
    const store = await readLinkStore();
    expect(store.links).toEqual([]);
  });

  it("addLink appends to existing store and returns the new link", async () => {
    const existing = makeLink({ id: "link-existing" });
    await writeLinkStore({ links: [existing], lastUpdateId: 5 });

    const created = await addLink({
      memo: "새 메모 https://new.com",
      urls: ["https://new.com"],
      primaryDomain: "new.com",
      source: "telegram",
      telegramMessageId: 999,
    });

    expect(created.id).toBeDefined();
    expect(created.id).not.toBe("link-existing");
    expect(created.read).toBe(false);
    expect(created.createdAt).toBeDefined();

    const store = await readLinkStore();
    expect(store.links).toHaveLength(2);
    expect(store.lastUpdateId).toBe(5); // unchanged
  });

  it("findByTelegramMessageId returns the matching link or undefined", async () => {
    const link = makeLink({ telegramMessageId: 555 });
    await writeLinkStore({ links: [link] });

    expect(await findByTelegramMessageId(555)).toBeDefined();
    expect(await findByTelegramMessageId(999)).toBeUndefined();
  });
});
