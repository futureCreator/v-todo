import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs/promises";
import { TODO_PATH, DATA_DIR } from "../store";

import { GET, POST } from "@/app/api/todos/route";

describe("GET /api/todos", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TODO_PATH, JSON.stringify({ todos: [] }));
  });

  it("returns empty array initially", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("applies decay on GET", async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    await fs.writeFile(
      TODO_PATH,
      JSON.stringify({
        todos: [
          {
            id: "decay-1",
            title: "Old item",
            stage: "now",
            completed: false,
            aiGenerated: false,
            createdAt: fourDaysAgo,
            stageMovedAt: fourDaysAgo,
            completedAt: null,
          },
        ],
      })
    );
    const res = await GET();
    const body = await res.json();
    expect(body.data[0].stage).toBe("soon");
  });
});

describe("POST /api/todos", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TODO_PATH, JSON.stringify({ todos: [] }));
  });

  it("creates a todo with stage=now", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "테스트 할 일" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.title).toBe("테스트 할 일");
    expect(body.data.stage).toBe("now");
    expect(body.data.completed).toBe(false);
    expect(body.data.stageMovedAt).toBeDefined();
  });

  it("rejects empty title", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects title over 200 chars", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "a".repeat(201) }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
