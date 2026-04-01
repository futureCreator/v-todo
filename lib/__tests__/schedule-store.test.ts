import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { readSchedules, writeSchedules, SCHEDULE_PATH } from "../schedule-store";
import { DATA_DIR } from "../store";
import type { Schedule } from "@/types";

describe("schedule-store", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SCHEDULE_PATH, JSON.stringify({ schedules: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(SCHEDULE_PATH); } catch {}
    try { await fs.unlink(path.join(DATA_DIR, "schedules.tmp.json")); } catch {}
  });

  it("reads empty schedules", async () => {
    const schedules = await readSchedules();
    expect(schedules).toEqual([]);
  });

  it("writes and reads schedules", async () => {
    const schedule: Schedule = {
      id: "sch-1",
      name: "테스트 일정",
      targetDate: "2026-04-01",
      originDate: "2026-04-01",
      type: "general",
      repeatMode: "none",
      isLunar: false,
      lunarMonth: null,
      lunarDay: null,
      createdAt: "2026-03-29T00:00:00Z",
    };
    await writeSchedules([schedule]);
    const result = await readSchedules();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("테스트 일정");
  });

  it("creates file if not exists", async () => {
    await fs.unlink(SCHEDULE_PATH);
    const schedules = await readSchedules();
    expect(schedules).toEqual([]);
  });
});
