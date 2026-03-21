import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs/promises";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "todos.json");

import { GET, POST } from "@/app/api/todos/route";

describe("GET /api/todos", () => {
  beforeEach(async () => {
    await fs.writeFile(DATA_PATH, JSON.stringify({ todos: [] }));
  });

  it("returns empty array initially", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

describe("POST /api/todos", () => {
  beforeEach(async () => {
    await fs.writeFile(DATA_PATH, JSON.stringify({ todos: [] }));
  });

  it("creates a todo", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "테스트 할 일",
        quadrant: "urgent-important",
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.title).toBe("테스트 할 일");
    expect(body.data.quadrant).toBe("urgent-important");
    expect(body.data.completed).toBe(false);
    expect(body.data.aiGenerated).toBe(false);
    expect(body.data.id).toBeDefined();
  });

  it("rejects empty title", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", quadrant: "urgent-important" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects title over 200 chars", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "a".repeat(201),
        quadrant: "urgent-important",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid quadrant", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "test", quadrant: "invalid" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
