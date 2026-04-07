import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs/promises";
import { LINKS_PATH } from "../link-store";
import { DATA_DIR } from "../store";

import { GET } from "@/app/api/links/route";

describe("GET /api/links", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LINKS_PATH, JSON.stringify({ links: [] }));
  });

  it("returns empty array initially", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("returns links sorted by createdAt descending", async () => {
    await fs.writeFile(
      LINKS_PATH,
      JSON.stringify({
        links: [
          {
            id: "old",
            memo: "older",
            urls: ["https://old.com"],
            primaryDomain: "old.com",
            read: false,
            source: "telegram",
            createdAt: "2026-04-01T00:00:00.000Z",
          },
          {
            id: "new",
            memo: "newer",
            urls: ["https://new.com"],
            primaryDomain: "new.com",
            read: false,
            source: "telegram",
            createdAt: "2026-04-07T00:00:00.000Z",
          },
        ],
      })
    );
    const res = await GET();
    const body = await res.json();
    expect(body.data.map((l: { id: string }) => l.id)).toEqual(["new", "old"]);
  });
});
