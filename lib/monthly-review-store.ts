import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/store";

const CACHE_PATH = path.join(DATA_DIR, "monthly-review.json");
const TMP_PATH = path.join(DATA_DIR, "monthly-review.tmp.json");

export interface MonthlyReviewCache {
  date: string;
  content: string;
  generatedAt: string;
}

function isCache(value: unknown): value is MonthlyReviewCache {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === "string" &&
    typeof v.content === "string" &&
    typeof v.generatedAt === "string"
  );
}

export async function readMonthlyReviewCache(): Promise<MonthlyReviewCache | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return isCache(parsed) ? parsed : null;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    return null;
  }
}

export async function writeMonthlyReviewCache(
  cache: MonthlyReviewCache
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(cache, null, 2));
  await fs.rename(TMP_PATH, CACHE_PATH);
}
