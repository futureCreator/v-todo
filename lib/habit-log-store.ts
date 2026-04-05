import fs from "fs/promises";
import path from "path";
import type { HabitLog, HabitLogStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const LOG_PATH = path.join(DATA_DIR, "habit-logs.json");
const TMP_PATH = path.join(DATA_DIR, "habit-logs.tmp.json");

export async function readHabitLogs(): Promise<HabitLog[]> {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf-8");
    const parsed: HabitLogStore = JSON.parse(raw);
    return parsed.logs;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(LOG_PATH, JSON.stringify({ logs: [] }));
      return [];
    }
    console.error("Failed to parse habit-logs.json, resetting:", err);
    await fs.writeFile(LOG_PATH, JSON.stringify({ logs: [] }));
    return [];
  }
}

export async function writeHabitLogs(logs: HabitLog[]): Promise<void> {
  const data: HabitLogStore = { logs };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, LOG_PATH);
}
