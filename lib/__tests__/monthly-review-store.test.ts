import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { readMonthlyReviewCache, writeMonthlyReviewCache, CACHE_PATH, DATA_DIR } from "../monthly-review-store";

const TMP_PATH = path.join(DATA_DIR, "monthly-review.tmp.json");

describe("monthly-review-store", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
  });

  afterEach(async () => {
    try { await fs.unlink(CACHE_PATH); } catch {}
    try { await fs.unlink(TMP_PATH); } catch {}
  });

  it("returns null when cache file does not exist", async () => {
    expect(await readMonthlyReviewCache()).toBeNull();
  });

  it("round-trips written cache", async () => {
    await writeMonthlyReviewCache({
      date: "2026-05-14",
      content: "### 관찰\n\n내용",
      generatedAt: "2026-05-14T09:12:00+09:00",
    });
    const cache = await readMonthlyReviewCache();
    expect(cache).toEqual({
      date: "2026-05-14",
      content: "### 관찰\n\n내용",
      generatedAt: "2026-05-14T09:12:00+09:00",
    });
  });

  it("returns null when cache JSON is corrupted", async () => {
    await fs.writeFile(CACHE_PATH, "{ this is not json");
    expect(await readMonthlyReviewCache()).toBeNull();
  });

  it("returns null when cache is missing required fields", async () => {
    await fs.writeFile(CACHE_PATH, JSON.stringify({ foo: "bar" }));
    expect(await readMonthlyReviewCache()).toBeNull();
  });

  it("overwrites existing cache atomically", async () => {
    await writeMonthlyReviewCache({
      date: "2026-05-13",
      content: "old",
      generatedAt: "2026-05-13T00:00:00+09:00",
    });
    await writeMonthlyReviewCache({
      date: "2026-05-14",
      content: "new",
      generatedAt: "2026-05-14T00:00:00+09:00",
    });
    const cache = await readMonthlyReviewCache();
    expect(cache?.date).toBe("2026-05-14");
    expect(cache?.content).toBe("new");
  });
});
