import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";

const TEST_DIR = path.join(process.cwd(), ".test-data", "monthly-review-store");
process.env.DATA_DIR = TEST_DIR;

// dynamic import after env var set
const { readMonthlyReviewCache, writeMonthlyReviewCache } = await import("../monthly-review-store");

const CACHE_PATH = path.join(TEST_DIR, "monthly-review.json");

async function reset() {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
}

describe("monthly-review-store", () => {
  beforeEach(reset);
  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
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
