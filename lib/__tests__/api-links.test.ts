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

import { PUT, DELETE } from "@/app/api/links/[id]/route";

describe("PUT /api/links/[id]", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      LINKS_PATH,
      JSON.stringify({
        links: [
          {
            id: "link-test-1",
            memo: "test memo https://example.com",
            urls: ["https://example.com"],
            primaryDomain: "example.com",
            read: false,
            source: "telegram",
            createdAt: "2026-04-07T00:00:00.000Z",
          },
        ],
      })
    );
  });

  it("marks a link as read and sets readAt", async () => {
    const req = new Request("http://localhost/api/links/link-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "link-test-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.read).toBe(true);
    expect(body.data.readAt).toBeDefined();
  });

  it("marks a link as unread and clears readAt", async () => {
    // first mark read
    const markReq = new Request("http://localhost/api/links/link-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    await PUT(markReq, { params: Promise.resolve({ id: "link-test-1" }) });

    // then mark unread
    const req = new Request("http://localhost/api/links/link-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: false }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "link-test-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.read).toBe(false);
    expect(body.data.readAt).toBeUndefined();
  });

  it("rejects invalid body (missing read)", async () => {
    const req = new Request("http://localhost/api/links/link-test-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "link-test-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown id", async () => {
    const req = new Request("http://localhost/api/links/nope", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/links/[id]", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      LINKS_PATH,
      JSON.stringify({
        links: [
          {
            id: "link-test-2",
            memo: "delete me",
            urls: ["https://example.com"],
            primaryDomain: "example.com",
            read: false,
            source: "telegram",
            createdAt: "2026-04-07T00:00:00.000Z",
          },
        ],
      })
    );
  });

  it("removes a link", async () => {
    const req = new Request("http://localhost/api/links/link-test-2", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "link-test-2" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toBeNull();

    const getRes = await GET();
    const getBody = await getRes.json();
    expect(getBody.data).toHaveLength(0);
  });

  it("returns 404 for unknown id", async () => {
    const req = new Request("http://localhost/api/links/nope", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
