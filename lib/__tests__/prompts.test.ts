import { describe, it, expect } from "vitest";
import { buildSuggestPrompt, buildCleanupPrompt, buildBriefingPrompt } from "../prompts";
import type { Todo } from "@/types";

const sampleTodo: Todo = {
  id: "1",
  title: "서버 점검",
  quadrant: "urgent-important",
  completed: false,
  aiGenerated: false,
  dueDate: "2026-03-25",
  createdAt: "2026-03-21T09:00:00Z",
  completedAt: null,
};

describe("buildSuggestPrompt", () => {
  it("includes quadrant label and todo list", () => {
    const prompt = buildSuggestPrompt("urgent-important", [sampleTodo]);
    expect(prompt).toContain("지금 하기");
    expect(prompt).toContain("서버 점검");
    expect(prompt).toContain("JSON");
  });
});

describe("buildCleanupPrompt", () => {
  it("includes todo IDs and titles", () => {
    const prompt = buildCleanupPrompt([sampleTodo]);
    expect(prompt).toContain("1");
    expect(prompt).toContain("서버 점검");
  });
});

describe("buildBriefingPrompt", () => {
  it("includes today's date and todos", () => {
    const prompt = buildBriefingPrompt([sampleTodo]);
    expect(prompt).toContain("서버 점검");
    expect(prompt).toContain("지금 하기");
    expect(prompt).toContain("2026-03-25");
  });
});
