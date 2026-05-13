// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimeCapsuleCard from "../TimeCapsuleCard";

type FetchResp = { ok: boolean; json: () => Promise<unknown>; text: () => Promise<string> };

function mockJson(payload: unknown): FetchResp {
  return {
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function mockNote(text: string): FetchResp {
  return {
    ok: true,
    json: async () => ({ data: text }),
    text: async () => text,
  };
}

function mockFailure(): FetchResp {
  return {
    ok: false,
    json: async () => ({ error: "x" }),
    text: async () => "",
  };
}

const ORIGINAL_FETCH = global.fetch;

function installFetch(routes: Record<string, FetchResp>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const key of Object.keys(routes)) {
      if (url.includes(key)) return routes[key] as unknown as Response;
    }
    return mockFailure() as unknown as Response;
  }) as unknown as typeof fetch;
}

describe("TimeCapsuleCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T09:00:00+09:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
    global.fetch = ORIGINAL_FETCH;
  });

  it("renders nothing when no past entries match today's MM-DD", async () => {
    installFetch({
      "/api/moods": mockJson({ data: { "2024-01-01": 4 } }),
      "/api/gratitude": mockJson({ data: null }),
      "/api/notes/daily": mockJson({ data: "" }),
    });
    const { container } = render(<TimeCapsuleCard onSelectDate={() => {}} />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("lists past years for same MM-DD in recent→old order with mood emoji", async () => {
    installFetch({
      "/api/moods": mockJson({
        data: {
          "2025-05-14": 4,
          "2024-05-14": 2,
          "2024-01-01": 3,
        },
      }),
      "/api/gratitude?date=2025-05-14": mockJson({
        data: { date: "2025-05-14", items: ["아침 산책", "", "", "", ""] },
      }),
      "/api/gratitude?date=2024-05-14": mockJson({ data: null }),
      "/api/notes/daily?date=2025-05-14": mockNote("산책했다"),
      "/api/notes/daily?date=2024-05-14": mockNote("힘들었다"),
    });

    render(<TimeCapsuleCard onSelectDate={() => {}} />);

    const items = await screen.findAllByRole("button");
    expect(items[0]).toHaveTextContent("2025-05-14");
    expect(items[0]).toHaveTextContent("😊");
    expect(items[0]).toHaveTextContent("아침 산책");
    expect(items[1]).toHaveTextContent("2024-05-14");
    expect(items[1]).toHaveTextContent("😔");
    expect(items[1]).toHaveTextContent("힘들었다");
  });

  it("falls back to note first line when gratitude is empty", async () => {
    installFetch({
      "/api/moods": mockJson({ data: { "2025-05-14": 3 } }),
      "/api/gratitude?date=2025-05-14": mockJson({ data: null }),
      "/api/notes/daily?date=2025-05-14": mockNote("# 헤딩\n\n첫 번째 의미있는 줄"),
    });
    render(<TimeCapsuleCard onSelectDate={() => {}} />);
    const row = await screen.findByRole("button");
    expect(row).toHaveTextContent("첫 번째 의미있는 줄");
  });

  it("calls onSelectDate with the row's date when clicked", async () => {
    const onSelect = vi.fn();
    installFetch({
      "/api/moods": mockJson({ data: { "2025-05-14": 4 } }),
      "/api/gratitude?date=2025-05-14": mockJson({
        data: { date: "2025-05-14", items: ["a", "", "", "", ""] },
      }),
      "/api/notes/daily?date=2025-05-14": mockNote(""),
    });
    render(<TimeCapsuleCard onSelectDate={onSelect} />);
    const row = await screen.findByRole("button");
    vi.useRealTimers();
    await userEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("2025-05-14");
  });

  it("renders a mood-only row when both gratitude and note are missing", async () => {
    installFetch({
      "/api/moods": mockJson({ data: { "2025-05-14": 5 } }),
      "/api/gratitude?date=2025-05-14": mockJson({ data: null }),
      "/api/notes/daily?date=2025-05-14": mockNote(""),
    });
    render(<TimeCapsuleCard onSelectDate={() => {}} />);
    const row = await screen.findByRole("button");
    expect(row).toHaveTextContent("😄");
  });

  it("renders nothing when /api/moods fails", async () => {
    global.fetch = vi.fn(async () => mockFailure() as unknown as Response) as unknown as typeof fetch;
    const { container } = render(<TimeCapsuleCard onSelectDate={() => {}} />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
