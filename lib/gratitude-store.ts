import fs from "fs/promises";
import path from "path";
import type { GratitudeEntry, GratitudeStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const GRATITUDE_PATH = path.join(DATA_DIR, "gratitude.json");
const TMP_PATH = path.join(DATA_DIR, "gratitude.tmp.json");

export async function readGratitudeEntries(): Promise<GratitudeEntry[]> {
  try {
    const raw = await fs.readFile(GRATITUDE_PATH, "utf-8");
    const parsed: GratitudeStore = JSON.parse(raw);
    return parsed.entries;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(GRATITUDE_PATH, JSON.stringify({ entries: [] }));
      return [];
    }
    console.error("Failed to parse gratitude.json, resetting:", err);
    await fs.writeFile(GRATITUDE_PATH, JSON.stringify({ entries: [] }));
    return [];
  }
}

export async function writeGratitudeEntries(entries: GratitudeEntry[]): Promise<void> {
  const data: GratitudeStore = { entries };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, GRATITUDE_PATH);
}

export async function readGratitudeByDate(date: string): Promise<GratitudeEntry | null> {
  const entries = await readGratitudeEntries();
  return entries.find((e) => e.date === date) ?? null;
}

export async function writeGratitudeByDate(date: string, items: [string, string, string, string, string]): Promise<GratitudeEntry> {
  const entries = await readGratitudeEntries();
  const hasContent = items.some((item) => item.trim().length > 0);

  if (!hasContent) {
    const filtered = entries.filter((e) => e.date !== date);
    if (filtered.length !== entries.length) {
      await writeGratitudeEntries(filtered);
    }
    return { date, items };
  }

  const index = entries.findIndex((e) => e.date === date);
  const entry: GratitudeEntry = { date, items };
  if (index >= 0) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }
  await writeGratitudeEntries(entries);
  return entry;
}
