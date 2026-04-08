import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { readMoods, writeMoods, readMoodByDate, writeMoodByDate, MOODS_PATH, DATA_DIR } from "../mood-store";
import type { MoodValue } from "@/types";

describe("mood-store", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(MOODS_PATH, JSON.stringify({}));
  });

  afterEach(async () => {
    try { await fs.unlink(MOODS_PATH); } catch {}
    try { await fs.unlink(path.join(DATA_DIR, "moods.tmp.json")); } catch {}
  });

  it("reads empty moods from file", async () => {
    const moods = await readMoods();
    expect(moods).toEqual({});
  });

  it("writes and reads moods", async () => {
    await writeMoods({ "2026-04-08": 5 });
    const moods = await readMoods();
    expect(moods["2026-04-08"]).toBe(5);
  });

  it("reads mood by date", async () => {
    await writeMoods({ "2026-04-08": 4, "2026-04-07": 2 });
    const mood = await readMoodByDate("2026-04-08");
    expect(mood).toBe(4);
  });

  it("returns null for missing date", async () => {
    const mood = await readMoodByDate("2026-01-01");
    expect(mood).toBeNull();
  });

  it("writes mood by date (insert)", async () => {
    await writeMoodByDate("2026-04-08", 5);
    const moods = await readMoods();
    expect(moods["2026-04-08"]).toBe(5);
  });

  it("writes mood by date (overwrite)", async () => {
    await writeMoods({ "2026-04-08": 3 });
    await writeMoodByDate("2026-04-08", 5);
    const moods = await readMoods();
    expect(moods["2026-04-08"]).toBe(5);
  });

  it("creates file if not exists", async () => {
    await fs.unlink(MOODS_PATH);
    const moods = await readMoods();
    expect(moods).toEqual({});
  });

  it("recovers from corrupted JSON", async () => {
    await fs.writeFile(MOODS_PATH, "not valid json{{{");
    const moods = await readMoods();
    expect(moods).toEqual({});
  });
});
