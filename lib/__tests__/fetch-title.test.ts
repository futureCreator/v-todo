import { describe, it, expect } from "vitest";
import { extractTitle } from "../fetch-title";

describe("extractTitle", () => {
  it("extracts title from HTML", () => {
    const html = "<html><head><title>Hello World</title></head></html>";
    expect(extractTitle(html)).toBe("Hello World");
  });

  it("returns null for missing title", () => {
    const html = "<html><head></head></html>";
    expect(extractTitle(html)).toBeNull();
  });

  it("trims whitespace from title", () => {
    const html = "<title>  Hello World  </title>";
    expect(extractTitle(html)).toBe("Hello World");
  });

  it("handles empty title", () => {
    const html = "<title></title>";
    expect(extractTitle(html)).toBeNull();
  });

  it("truncates long titles to 200 chars", () => {
    const longTitle = "A".repeat(300);
    const html = `<title>${longTitle}</title>`;
    expect(extractTitle(html)!.length).toBe(200);
  });
});
