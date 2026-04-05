import fs from "fs/promises";
import path from "path";
import type { Habit, HabitStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const HABIT_PATH = path.join(DATA_DIR, "habits.json");
const TMP_PATH = path.join(DATA_DIR, "habits.tmp.json");

export async function readHabits(): Promise<Habit[]> {
  try {
    const raw = await fs.readFile(HABIT_PATH, "utf-8");
    const parsed: HabitStore = JSON.parse(raw);
    return parsed.habits;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(HABIT_PATH, JSON.stringify({ habits: [] }));
      return [];
    }
    console.error("Failed to parse habits.json, resetting:", err);
    await fs.writeFile(HABIT_PATH, JSON.stringify({ habits: [] }));
    return [];
  }
}

export async function writeHabits(habits: Habit[]): Promise<void> {
  const data: HabitStore = { habits };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, HABIT_PATH);
}
