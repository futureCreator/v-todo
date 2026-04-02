import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs/promises";
import { WISH_PATH } from "../wish-store";
import { DATA_DIR } from "../store";

import { GET, POST } from "@/app/api/wishes/route";
import { PUT, DELETE } from "@/app/api/wishes/[id]/route";

describe("GET /api/wishes", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(WISH_PATH, JSON.stringify({ wishes: [] }));
  });

  it("returns empty array initially", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

describe("POST /api/wishes", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(WISH_PATH, JSON.stringify({ wishes: [] }));
  });

  it("creates an item wish with all fields", async () => {
    const req = new Request("http://localhost/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "새 맥북",
        category: "item",
        price: 2000000,
        url: "https://apple.com",
        imageUrl: "https://apple.com/image.jpg",
        memo: "M4 모델로",
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.title).toBe("새 맥북");
    expect(body.data.category).toBe("item");
    expect(body.data.price).toBe(2000000);
    expect(body.data.url).toBe("https://apple.com");
    expect(body.data.imageUrl).toBe("https://apple.com/image.jpg");
    expect(body.data.memo).toBe("M4 모델로");
    expect(body.data.completed).toBe(false);
    expect(body.data.completedAt).toBeNull();
    expect(body.data.id).toBeDefined();
    expect(body.data.createdAt).toBeDefined();
  });

  it("creates an experience wish with minimal fields", async () => {
    const req = new Request("http://localhost/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "제주도 여행",
        category: "experience",
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.title).toBe("제주도 여행");
    expect(body.data.category).toBe("experience");
    expect(body.data.price).toBeNull();
    expect(body.data.url).toBeNull();
    expect(body.data.imageUrl).toBeNull();
    expect(body.data.memo).toBeNull();
  });

  it("rejects empty title", async () => {
    const req = new Request("http://localhost/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "",
        category: "item",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid category", async () => {
    const req = new Request("http://localhost/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "테스트",
        category: "invalid",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/wishes/[id]", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      WISH_PATH,
      JSON.stringify({
        wishes: [
          {
            id: "wish-test-1",
            title: "원래 제목",
            category: "item",
            price: null,
            url: null,
            imageUrl: null,
            memo: null,
            completed: false,
            completedAt: null,
            createdAt: "2026-04-02T00:00:00Z",
          },
        ],
      })
    );
  });

  it("updates title", async () => {
    const req = new Request("http://localhost/api/wishes/wish-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "새로운 제목" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "wish-test-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.title).toBe("새로운 제목");
  });

  it("toggles completed and sets completedAt", async () => {
    const req = new Request("http://localhost/api/wishes/wish-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "wish-test-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(true);
    expect(body.data.completedAt).not.toBeNull();
  });

  it("returns 404 for unknown id", async () => {
    const req = new Request("http://localhost/api/wishes/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "test" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/wishes/[id]", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      WISH_PATH,
      JSON.stringify({
        wishes: [
          {
            id: "wish-test-2",
            title: "삭제할 위시",
            category: "experience",
            price: null,
            url: null,
            imageUrl: null,
            memo: null,
            completed: false,
            completedAt: null,
            createdAt: "2026-04-02T00:00:00Z",
          },
        ],
      })
    );
  });

  it("removes wish", async () => {
    const req = new Request("http://localhost/api/wishes/wish-test-2", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "wish-test-2" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toBeNull();

    // Verify it's gone
    const getRes = await GET();
    const getBody = await getRes.json();
    expect(getBody.data).toHaveLength(0);
  });

  it("returns 404 for unknown id", async () => {
    const req = new Request("http://localhost/api/wishes/nonexistent", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});
