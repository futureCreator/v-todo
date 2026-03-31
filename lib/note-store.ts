import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/store";

const DAILY_DIR = path.join(DATA_DIR, "daily-notes");

function dateToFilename(date: string): string {
  return `${date}.md`;
}

export async function readDailyNote(date: string): Promise<string> {
  try {
    const filePath = path.join(DAILY_DIR, dateToFilename(date));
    return await fs.readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return "";
    }
    throw err;
  }
}

export async function writeDailyNote(
  date: string,
  content: string
): Promise<void> {
  await fs.mkdir(DAILY_DIR, { recursive: true });
  const filePath = path.join(DAILY_DIR, dateToFilename(date));

  if (content.trim() === "") {
    try {
      await fs.unlink(filePath);
    } catch {
      // file didn't exist, that's fine
    }
    return;
  }

  const tmpPath = filePath + ".tmp";
  await fs.writeFile(tmpPath, content);
  await fs.rename(tmpPath, filePath);
}
