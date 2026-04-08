import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { readWishes, writeWishes, WISH_PATH } from "../wish-store";
import { DATA_DIR } from "../store";
import type { WishItem } from "@/types";

describe("wish-store", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(WISH_PATH, JSON.stringify({ wishes: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(WISH_PATH); } catch {}
    try { await fs.unlink(path.join(DATA_DIR, "wishes.tmp.json")); } catch {}
  });

  it("reads empty wishes", async () => {
    const wishes = await readWishes();
    expect(wishes).toEqual([]);
  });

  it("writes and reads wishes", async () => {
    const wish: WishItem = {
      id: "wish-1",
      title: "테스트 위시",
      category: "item",
      price: 50000,
      url: null,
      imageUrl: null,
      memo: null,
      completed: false,
      completedAt: null,
      actualPrice: null,
      satisfaction: null,
      review: null,
      createdAt: "2026-04-02T00:00:00Z",
    };
    await writeWishes([wish]);
    const result = await readWishes();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("테스트 위시");
  });

  it("creates file if not exists", async () => {
    await fs.unlink(WISH_PATH);
    const wishes = await readWishes();
    expect(wishes).toEqual([]);
  });
});
