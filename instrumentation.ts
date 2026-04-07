// instrumentation.ts — Next.js boot hook. Starts the Telegram link poller once per server instance.

export async function register(): Promise<void> {
  // Only run on the Node.js server runtime (not Edge).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Opt-out switch for development.
  if (process.env.LINK_POLLER_ENABLED !== undefined && process.env.LINK_POLLER_ENABLED !== "true") {
    console.log("[link-poller] disabled via LINK_POLLER_ENABLED");
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdRaw = process.env.TELEGRAM_ALLOWED_CHAT_ID;

  if (!token || !chatIdRaw) {
    console.warn(
      "[link-poller] disabled: TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_CHAT_ID are required"
    );
    return;
  }

  const allowedChatId = Number.parseInt(chatIdRaw, 10);
  if (!Number.isFinite(allowedChatId)) {
    console.warn(
      "[link-poller] disabled: TELEGRAM_ALLOWED_CHAT_ID must be an integer"
    );
    return;
  }

  // Workaround for Node 18+ Happy Eyeballs bug: when IPv6 fails fast with
  // EHOSTUNREACH (typical home/office networks without IPv6 transit), the
  // parallel IPv4 connect can be left in a broken state and time out, even
  // though a plain IPv4 socket succeeds. Prefer IPv4 and disable autoSelectFamily
  // so fetch() goes straight to a working IPv4 connection.
  // See: https://github.com/nodejs/node/issues/47644
  const dns = await import("node:dns");
  const net = await import("node:net");
  dns.setDefaultResultOrder("ipv4first");
  net.setDefaultAutoSelectFamily(false);

  // Survive HMR / module reloads in dev by parking the instance on globalThis.
  type Singleton = { __linkPoller?: { stop: () => void } };
  const g = globalThis as unknown as Singleton;
  if (g.__linkPoller) {
    g.__linkPoller.stop();
  }

  const { TelegramPoller } = await import("./lib/telegram-poller");
  const timeoutSec = Number.parseInt(
    process.env.LINK_POLLER_TIMEOUT_SEC ?? "30",
    10
  );
  const poller = new TelegramPoller({
    token,
    allowedChatId,
    timeoutSec,
    debug: process.env.LINK_POLLER_DEBUG === "true",
  });
  poller.start();
  g.__linkPoller = poller;
  console.log("[link-poller] started");
}
