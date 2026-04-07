import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import {
  isAuthorized,
  extractDomain,
  processUpdate,
  TelegramPoller,
  type TelegramUpdate,
} from "../telegram-poller";
import { LINKS_PATH, readLinkStore } from "../link-store";
import { DATA_DIR } from "../store";

const ALLOWED_CHAT_ID = 12345;

function makeUpdate(overrides: Partial<TelegramUpdate> = {}): TelegramUpdate {
  return {
    update_id: 1,
    message: {
      message_id: 100,
      chat: { id: ALLOWED_CHAT_ID },
      text: "https://example.com",
      entities: [{ type: "url", offset: 0, length: 19 }],
    },
    ...overrides,
  };
}

describe("isAuthorized", () => {
  it("returns true when chat id matches", () => {
    expect(
      isAuthorized({ message_id: 1, chat: { id: 12345 }, text: "x" }, 12345)
    ).toBe(true);
  });

  it("returns false when chat id does not match", () => {
    expect(
      isAuthorized({ message_id: 1, chat: { id: 99 }, text: "x" }, 12345)
    ).toBe(false);
  });
});

describe("extractDomain", () => {
  it("returns domain for https URL", () => {
    expect(extractDomain("https://www.react.dev/blog")).toBe("www.react.dev");
  });

  it("returns domain for http URL", () => {
    expect(extractDomain("http://example.com")).toBe("example.com");
  });

  it("returns empty string for invalid URL", () => {
    expect(extractDomain("not a url")).toBe("");
  });
});

describe("processUpdate", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LINKS_PATH, JSON.stringify({ links: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(LINKS_PATH); } catch {}
  });

  it("saves a new link and replies on success", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    await processUpdate(makeUpdate(), {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(1);
    expect(store.links[0].urls).toEqual(["https://example.com"]);
    expect(store.links[0].primaryDomain).toBe("example.com");
    expect(store.links[0].telegramMessageId).toBe(100);
    expect(sendMessage).toHaveBeenCalledWith(
      ALLOWED_CHAT_ID,
      expect.stringContaining("저장")
    );
  });

  it("skips messages from unauthorized chats", async () => {
    const sendMessage = vi.fn();
    const update = makeUpdate({
      message: {
        message_id: 1,
        chat: { id: 99999 },
        text: "https://example.com",
      },
    });
    await processUpdate(update, {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("replies but does not save when message has no text", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const update = makeUpdate({
      message: { message_id: 1, chat: { id: ALLOWED_CHAT_ID } },
    });
    await processUpdate(update, {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(0);
    expect(sendMessage).toHaveBeenCalledWith(
      ALLOWED_CHAT_ID,
      expect.stringContaining("텍스트")
    );
  });

  it("replies but does not save when text has no URLs", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const update = makeUpdate({
      message: {
        message_id: 1,
        chat: { id: ALLOWED_CHAT_ID },
        text: "그냥 메모입니다",
      },
    });
    await processUpdate(update, {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(0);
    expect(sendMessage).toHaveBeenCalledWith(
      ALLOWED_CHAT_ID,
      expect.stringContaining("URL")
    );
  });

  it("dedupes by telegram message id", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    await processUpdate(makeUpdate(), {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });
    // Same update again
    await processUpdate(makeUpdate(), {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links).toHaveLength(1);
  });

  it("preserves the original message text as memo", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const update = makeUpdate({
      message: {
        message_id: 1,
        chat: { id: ALLOWED_CHAT_ID },
        text: "오늘 본 글 https://react.dev #react 좋다",
        entities: [{ type: "url", offset: 7, length: 17 }],
      },
    });
    await processUpdate(update, {
      token: "test",
      allowedChatId: ALLOWED_CHAT_ID,
      sendMessage,
    });

    const store = await readLinkStore();
    expect(store.links[0].memo).toBe("오늘 본 글 https://react.dev #react 좋다");
  });
});

describe("TelegramPoller (smoke)", () => {
  beforeEach(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LINKS_PATH, JSON.stringify({ links: [] }));
  });

  afterEach(async () => {
    try { await fs.unlink(LINKS_PATH); } catch {}
  });

  it("calls fetch with the correct URL on start, then halts when stopped", async () => {
    let resolveFetch: ((v: Response) => void) | null = null;
    const fetchSpy = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const poller = new TelegramPoller({
      token: "TESTTOKEN",
      allowedChatId: ALLOWED_CHAT_ID,
      timeoutSec: 1,
      fetch: fetchSpy as unknown as typeof fetch,
    });
    poller.start();

    // Allow microtasks to schedule the first fetch
    await new Promise((r) => setTimeout(r, 10));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toContain("/botTESTTOKEN/getUpdates");
    expect(fetchSpy.mock.calls[0][0]).toContain("timeout=1");

    poller.stop();
    // Resolve the pending fetch with an empty result so the loop sees stopped state
    if (resolveFetch) {
      (resolveFetch as (v: Response) => void)(
        new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 })
      );
    }
    await new Promise((r) => setTimeout(r, 10));

    // After stop, no further fetches
    const callsAfterStop = fetchSpy.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchSpy.mock.calls.length).toBe(callsAfterStop);
  });
});
