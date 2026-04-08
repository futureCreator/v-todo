import fs from "fs/promises";
import path from "path";
import type { MoodMap, MoodValue } from "@/types";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const MOODS_PATH = path.join(DATA_DIR, "moods.json");
const TMP_PATH = path.join(DATA_DIR, "moods.tmp.json");

export async function readMoods(): Promise<MoodMap> {
  try {
    const raw = await fs.readFile(MOODS_PATH, "utf-8");
    return JSON.parse(raw) as MoodMap;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(MOODS_PATH, JSON.stringify({}));
      return {};
    }
    console.error("Failed to parse moods.json, resetting:", err);
    await fs.writeFile(MOODS_PATH, JSON.stringify({}));
    return {};
  }
}

export async function writeMoods(moods: MoodMap): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(moods, null, 2));
  await fs.rename(TMP_PATH, MOODS_PATH);
}

export async function readMoodByDate(date: string): Promise<MoodValue | null> {
  const moods = await readMoods();
  return (moods[date] as MoodValue) ?? null;
}

export async function writeMoodByDate(date: string, value: MoodValue): Promise<void> {
  const moods = await readMoods();
  moods[date] = value;
  await writeMoods(moods);
}
