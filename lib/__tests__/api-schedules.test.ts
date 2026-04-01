import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs/promises";
import { SCHEDULE_PATH } from "../schedule-store";
import { DATA_DIR } from "../store";

import { GET, POST } from "@/app/api/schedules/route";

describe("GET /api/schedules", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SCHEDULE_PATH, JSON.stringify({ schedules: [] }));
  });

  it("returns empty array initially", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

describe("POST /api/schedules", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SCHEDULE_PATH, JSON.stringify({ schedules: [] }));
  });

  it("creates a general schedule", async () => {
    const req = new Request("http://localhost/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "테스트 일정",
        targetDate: "2026-04-15",
        originDate: "2026-04-15",
        type: "general",
        repeatMode: "none",
        isLunar: false,
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.name).toBe("테스트 일정");
    expect(body.data.type).toBe("general");
    expect(body.data.id).toBeDefined();
  });

  it("creates an anniversary schedule", async () => {
    const req = new Request("http://localhost/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "기념일",
        targetDate: "2026-04-15",
        originDate: "2025-04-15",
        type: "anniversary",
        repeatMode: "yearly",
        isLunar: false,
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.repeatMode).toBe("yearly");
  });

  it("rejects empty name", async () => {
    const req = new Request("http://localhost/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        targetDate: "2026-04-15",
        originDate: "2026-04-15",
        type: "general",
        repeatMode: "none",
        isLunar: false,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid type", async () => {
    const req = new Request("http://localhost/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test",
        targetDate: "2026-04-15",
        originDate: "2026-04-15",
        type: "invalid",
        repeatMode: "none",
        isLunar: false,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
