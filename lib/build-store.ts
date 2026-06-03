import fs from "fs/promises";
import path from "path";
import type { KanbanCard, BuildStore, KanbanColumn } from "@/types";
import { KANBAN_COLUMNS, LEGACY_KANBAN_COLUMN_MAP } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const BUILD_PATH = path.join(DATA_DIR, "build.json");
const TMP_PATH = path.join(DATA_DIR, "build.tmp.json");

function normalizeColumn(column: string): KanbanColumn {
  if (KANBAN_COLUMNS.includes(column as KanbanColumn)) {
    return column as KanbanColumn;
  }
  return LEGACY_KANBAN_COLUMN_MAP[column] ?? "idea";
}

function migrateCards(cards: KanbanCard[]): { cards: KanbanCard[]; changed: boolean } {
  let changed = false;
  const migrated = cards.map((card) => {
    const column = normalizeColumn(card.column);
    if (column !== card.column) {
      changed = true;
      return { ...card, column };
    }
    return card;
  });
  return { cards: migrated, changed };
}

export async function readBuildCards(): Promise<KanbanCard[]> {
  try {
    const raw = await fs.readFile(BUILD_PATH, "utf-8");
    const parsed: BuildStore = JSON.parse(raw);
    const { cards, changed } = migrateCards(parsed.cards);
    if (changed) {
      await writeBuildCards(cards);
    }
    return cards;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(BUILD_PATH, JSON.stringify({ cards: [] }));
      return [];
    }
    console.error("Failed to parse build.json, resetting:", err);
    await fs.writeFile(BUILD_PATH, JSON.stringify({ cards: [] }));
    return [];
  }
}

export async function writeBuildCards(cards: KanbanCard[]): Promise<void> {
  const data: BuildStore = { cards };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(data, null, 2));
  await fs.rename(TMP_PATH, BUILD_PATH);
}
