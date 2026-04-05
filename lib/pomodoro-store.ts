import fs from "fs/promises";
import path from "path";
import type { PomodoroLog, PomodoroLogStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const POMODORO_PATH = path.join(DATA_DIR, "pomodoro-logs.json");
const TMP_PATH = path.join(DATA_DIR, "pomodoro-logs.tmp.json");

export async function readPomodoroLogs(): Promise<PomodoroLog[]> {
  try {
    const raw = await fs.readFile(POMODORO_PATH, "utf-8");
    const parsed: PomodoroLogStore = JSON.parse(raw);
    return parsed.logs;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(POMODORO_PATH, JSON.stringify({ logs: [] }));
      return [];
    }
    console.error("Failed to parse pomodoro-logs.json, resetting:", err);
    await fs.writeFile(POMODORO_PATH, JSON.stringify({ logs: [] }));
    return [];
  }
}

export async function writePomodoroLogs(logs: PomodoroLog[]): Promise<void> {
  const data: PomodoroLogStore = { logs };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, POMODORO_PATH);
}

export async function addPomodoroLog(log: PomodoroLog): Promise<PomodoroLog> {
  const logs = await readPomodoroLogs();
  logs.push(log);
  await writePomodoroLogs(logs);
  return log;
}
