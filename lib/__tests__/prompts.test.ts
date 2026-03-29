import { describe, it, expect } from "vitest";
import { buildBriefingPrompt } from "../prompts";
import type { Todo, Schedule } from "@/types";

describe("buildBriefingPrompt", () => {
  it("includes todo stage labels", () => {
    const todos: Todo[] = [
      {
        id: "1",
        title: "테스트",
        stage: "now",
        completed: false,
        aiGenerated: false,
        createdAt: "2026-03-29T00:00:00Z",
        stageMovedAt: "2026-03-29T00:00:00Z",
        completedAt: null,
      },
    ];
    const prompt = buildBriefingPrompt(todos, []);
    expect(prompt).toContain("지금");
    expect(prompt).toContain("테스트");
  });

  it("includes upcoming schedules", () => {
    const schedules: Schedule[] = [
      {
        id: "s1",
        name: "프로젝트 마감",
        targetDate: "2026-04-01",
        originDate: "2026-04-01",
        type: "general",
        repeatMode: "none",
        isLunar: false,
        lunarMonth: null,
        lunarDay: null,
        createdAt: "2026-03-29T00:00:00Z",
      },
    ];
    const prompt = buildBriefingPrompt([], schedules);
    expect(prompt).toContain("프로젝트 마감");
    expect(prompt).toContain("D-day");
  });

  it("includes markdown instruction", () => {
    const prompt = buildBriefingPrompt([], []);
    expect(prompt).toContain("마크다운");
  });
});
