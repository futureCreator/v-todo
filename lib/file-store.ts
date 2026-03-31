import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/store";
import type { FileItem } from "@/types";

const NOTES_DIR = path.join(DATA_DIR, "notes");

const ALLOWED_NAME = /^[가-힣a-zA-Z0-9\s_\-\.]+$/;

function safePath(userPath: string): string {
  const normalized = path.normalize(userPath).replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new Error("Invalid path");
  }
  return path.join(NOTES_DIR, normalized);
}

function validateName(name: string): void {
  if (!name || !ALLOWED_NAME.test(name)) {
    throw new Error("Invalid file name");
  }
}

export async function listFiles(dirPath: string): Promise<FileItem[]> {
  const fullPath = safePath(dirPath);
  await fs.mkdir(fullPath, { recursive: true });

  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  const items: FileItem[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.endsWith(".tmp")) continue;
    const stat = await fs.stat(path.join(fullPath, entry.name));
    items.push({
      name: entry.name,
      type: entry.isDirectory() ? "directory" : "file",
      modifiedAt: stat.mtime.toISOString(),
    });
  }

  // folders first, then files, each sorted by name
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, "ko");
  });

  return items;
}

export async function readFile(filePath: string): Promise<string> {
  const fullPath = safePath(filePath);
  try {
    return await fs.readFile(fullPath, "utf-8");
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

export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  const fullPath = safePath(filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const tmpPath = fullPath + ".tmp";
  await fs.writeFile(tmpPath, content);
  await fs.rename(tmpPath, fullPath);
}

export async function createItem(
  dirPath: string,
  name: string,
  type: "file" | "directory"
): Promise<void> {
  validateName(name);
  const fullPath = safePath(path.join(dirPath, name));

  if (type === "directory") {
    await fs.mkdir(fullPath, { recursive: true });
  } else {
    const fileName = name.endsWith(".md") ? name : `${name}.md`;
    const filePath = safePath(path.join(dirPath, fileName));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "");
  }
}

export async function deleteItem(itemPath: string): Promise<void> {
  const fullPath = safePath(itemPath);
  const stat = await fs.stat(fullPath);
  if (stat.isDirectory()) {
    await fs.rm(fullPath, { recursive: true });
  } else {
    await fs.unlink(fullPath);
  }
}

export async function renameItem(
  itemPath: string,
  newName: string
): Promise<void> {
  validateName(newName);
  const fullPath = safePath(itemPath);
  const dir = path.dirname(fullPath);
  const newFullPath = path.join(dir, newName);
  await fs.rename(fullPath, newFullPath);
}
