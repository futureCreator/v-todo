import fs from "fs/promises";
import path from "path";
import type { Schedule, ScheduleStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const SCHEDULE_PATH = path.join(DATA_DIR, "schedules.json");
const TMP_PATH = path.join(DATA_DIR, "schedules.tmp.json");

export async function readSchedules(): Promise<Schedule[]> {
  try {
    const raw = await fs.readFile(SCHEDULE_PATH, "utf-8");
    const parsed: ScheduleStore = JSON.parse(raw);
    return parsed.schedules;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(SCHEDULE_PATH, JSON.stringify({ schedules: [] }));
      return [];
    }
    console.error("Failed to parse schedules.json, resetting:", err);
    await fs.writeFile(SCHEDULE_PATH, JSON.stringify({ schedules: [] }));
    return [];
  }
}

export async function writeSchedules(schedules: Schedule[]): Promise<void> {
  const data: ScheduleStore = { schedules };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, SCHEDULE_PATH);
}
