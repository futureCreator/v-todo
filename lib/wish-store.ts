import fs from "fs/promises";
import path from "path";
import type { WishItem, WishStore } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const WISH_PATH = path.join(DATA_DIR, "wishes.json");
const TMP_PATH = path.join(DATA_DIR, "wishes.tmp.json");

export async function readWishes(): Promise<WishItem[]> {
  try {
    const raw = await fs.readFile(WISH_PATH, "utf-8");
    const parsed: WishStore = JSON.parse(raw);
    return parsed.wishes;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(WISH_PATH, JSON.stringify({ wishes: [] }));
      return [];
    }
    console.error("Failed to parse wishes.json, resetting:", err);
    await fs.writeFile(WISH_PATH, JSON.stringify({ wishes: [] }));
    return [];
  }
}

export async function writeWishes(wishes: WishItem[]): Promise<void> {
  const data: WishStore = { wishes };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, WISH_PATH);
}
