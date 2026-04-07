import { describe, it, expect } from "vitest";
import { extractUrls, type TelegramEntity } from "../url-extract";

describe("extractUrls", () => {
  it("returns empty array when text has no URLs", () => {
    expect(extractUrls("그냥 메모입니다", undefined)).toEqual([]);
  });

  it("extracts a single URL via regex when entities are absent", () => {
    expect(extractUrls("이거 봐 https://react.dev 좋다", undefined)).toEqual([
      "https://react.dev",
    ]);
  });

  it("extracts multiple URLs preserving order", () => {
    expect(
      extractUrls("https://a.com 그리고 https://b.com", undefined)
    ).toEqual(["https://a.com", "https://b.com"]);
  });

  it("strips trailing punctuation", () => {
    expect(extractUrls("https://example.com.", undefined)).toEqual([
      "https://example.com",
    ]);
    expect(extractUrls("(see https://example.com)", undefined)).toEqual([
      "https://example.com",
    ]);
    expect(extractUrls("link: https://example.com,", undefined)).toEqual([
      "https://example.com",
    ]);
  });

  it("deduplicates same URL within one message (preserving first occurrence)", () => {
    expect(
      extractUrls("https://a.com 그리고 https://a.com 또", undefined)
    ).toEqual(["https://a.com"]);
  });

  it("uses entities when provided, ignoring regex", () => {
    const text = "보세요 https://example.com 와 https://other.com";
    const entities: TelegramEntity[] = [
      { type: "url", offset: 4, length: 19 },
    ];
    // Only the entity URL is returned even though regex would find two
    expect(extractUrls(text, entities)).toEqual(["https://example.com"]);
  });

  it("ignores non-url entities", () => {
    const text = "@me check https://example.com";
    const entities: TelegramEntity[] = [
      { type: "mention", offset: 0, length: 3 },
      { type: "url", offset: 10, length: 19 },
    ];
    expect(extractUrls(text, entities)).toEqual(["https://example.com"]);
  });

  it("handles http and https schemes", () => {
    expect(extractUrls("http://old.com and https://new.com", undefined)).toEqual([
      "http://old.com",
      "https://new.com",
    ]);
  });
});
