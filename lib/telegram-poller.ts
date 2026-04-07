// lib/telegram-poller.ts — Telegram bot long-polling worker for the link archive.

import {
  addLink,
  findByTelegramMessageId,
  readLinkStore,
  writeLinkStore,
} from "@/lib/link-store";
import { extractUrls, type TelegramEntity } from "@/lib/url-extract";

/* ---------------------------------------------------------------- types --- */

export interface TelegramChat {
  id: number;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  entities?: TelegramEntity[];
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramGetUpdatesResponse {
  ok: boolean;
  result: TelegramUpdate[];
  description?: string;
}

/* ----------------------------------------------------------- pure helpers - */

export function isAuthorized(
  message: TelegramMessage,
  allowedChatId: number
): boolean {
  return message.chat?.id === allowedChatId;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/* --------------------------------------------------------- side effects --- */

export interface ProcessUpdateConfig {
  token: string;
  allowedChatId: number;
  /** Telegram sendMessage shim — pass a stub in tests. */
  sendMessage: (chatId: number, text: string) => Promise<void>;
  debug?: boolean;
}

/**
 * Handle one Telegram update: validate, dedupe, save, and reply.
 *
 * Throws are caught by the caller (the poll loop) so a single bad update
 * does not kill the worker.
 */
export async function processUpdate(
  update: TelegramUpdate,
  config: ProcessUpdateConfig
): Promise<void> {
  const message = update.message;
  if (!message) return;

  if (config.debug) {
    console.log(
      `[link-poller] update ${update.update_id} from chat ${message.chat?.id}`
    );
  }

  if (!isAuthorized(message, config.allowedChatId)) {
    return; // silent: do not reveal the bot to strangers
  }

  if (!message.text || message.text.trim().length === 0) {
    await safeSend(
      config.sendMessage,
      message.chat.id,
      "텍스트 메시지만 처리합니다."
    );
    return;
  }

  // Idempotency: skip if we already saved this message
  const existing = await findByTelegramMessageId(message.message_id);
  if (existing) {
    return;
  }

  const urls = extractUrls(message.text, message.entities);
  if (urls.length === 0) {
    await safeSend(
      config.sendMessage,
      message.chat.id,
      "URL을 찾지 못했어요."
    );
    return;
  }

  await addLink({
    memo: message.text,
    urls,
    primaryDomain: extractDomain(urls[0]),
    source: "telegram",
    telegramMessageId: message.message_id,
  });

  await safeSend(config.sendMessage, message.chat.id, "✅ 저장됨");
}

async function safeSend(
  sendMessage: (chatId: number, text: string) => Promise<void>,
  chatId: number,
  text: string
): Promise<void> {
  try {
    await sendMessage(chatId, text);
  } catch (err) {
    console.warn("[link-poller] failed to reply:", err);
  }
}

/* ---------------------------------------------------- the polling worker - */

export interface PollerOptions {
  token: string;
  allowedChatId: number;
  /** getUpdates long-poll timeout in seconds. Default 30. */
  timeoutSec?: number;
  /** Logs each update for debugging. */
  debug?: boolean;
  /** Injectable fetch for tests. Defaults to global fetch. */
  fetch?: typeof fetch;
}

export class TelegramPoller {
  private readonly token: string;
  private readonly allowedChatId: number;
  private readonly timeoutSec: number;
  private readonly debug: boolean;
  private readonly fetchImpl: typeof fetch;
  private running = false;
  private offset: number | undefined;
  /** Backoff in ms; reset on success, doubles up to 60_000 on failure. */
  private backoffMs = 0;

  constructor(opts: PollerOptions) {
    this.token = opts.token;
    this.allowedChatId = opts.allowedChatId;
    this.timeoutSec = opts.timeoutSec ?? 30;
    this.debug = opts.debug ?? false;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    // Resume from persisted offset if any
    try {
      const store = await readLinkStore();
      if (store.lastUpdateId !== undefined) {
        this.offset = store.lastUpdateId + 1;
      }
    } catch {
      // ignore — pollOnce will create the file if needed
    }

    while (this.running) {
      try {
        const updates = await this.pollOnce();
        for (const update of updates) {
          if (!this.running) break;
          try {
            await processUpdate(update, {
              token: this.token,
              allowedChatId: this.allowedChatId,
              sendMessage: this.sendMessage.bind(this),
              debug: this.debug,
            });
            await this.persistOffset(update.update_id);
            this.offset = update.update_id + 1;
          } catch (err) {
            console.error("[link-poller] failed to process update", err);
            // Do not advance offset — will retry on next poll
            break;
          }
        }
        this.backoffMs = 0;
      } catch (err) {
        console.error("[link-poller] poll error:", err);
        this.backoffMs = Math.min(Math.max(this.backoffMs * 2, 2000), 60_000);
        await sleep(this.backoffMs);
      }
    }
  }

  private async pollOnce(): Promise<TelegramUpdate[]> {
    const params = new URLSearchParams({
      timeout: String(this.timeoutSec),
    });
    if (this.offset !== undefined) {
      params.set("offset", String(this.offset));
    }
    const url = `https://api.telegram.org/bot${this.token}/getUpdates?${params.toString()}`;

    const res = await this.fetchImpl(url);
    if (res.status === 401) {
      this.running = false;
      throw new Error("Telegram bot token is invalid (401). Stopping poller.");
    }
    if (!res.ok) {
      throw new Error(`Telegram getUpdates failed: ${res.status}`);
    }
    const body = (await res.json()) as TelegramGetUpdatesResponse;
    if (!body.ok) {
      throw new Error(`Telegram API error: ${body.description ?? "unknown"}`);
    }
    return body.result;
  }

  private async sendMessage(chatId: number, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  }

  private async persistOffset(updateId: number): Promise<void> {
    const store = await readLinkStore();
    store.lastUpdateId = updateId;
    await writeLinkStore(store);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
