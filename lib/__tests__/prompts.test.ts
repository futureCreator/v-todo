import { describe, it, expect } from "vitest";
import { buildBriefingPrompt } from "../prompts";
import { buildWeeklyReviewPrompt } from "../prompts";
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

describe("buildWeeklyReviewPrompt", () => {
  it("includes all provided daily notes with day labels", () => {
    const notes = [
      { date: "2026-03-30", day: "월요일", content: "프로젝트 킥오프" },
      { date: "2026-04-01", day: "수요일", content: "디자인 리뷰 완료" },
    ];
    const prompt = buildWeeklyReviewPrompt(notes, null);
    expect(prompt).toContain("월요일 (2026-03-30)");
    expect(prompt).toContain("프로젝트 킥오프");
    expect(prompt).toContain("수요일 (2026-04-01)");
    expect(prompt).toContain("디자인 리뷰 완료");
  });

  it("includes previous review when provided", () => {
    const notes = [{ date: "2026-03-30", day: "월요일", content: "작업 내용" }];
    const prevReview = "- 지난주 핵심: 집중력 저하 패턴";
    const prompt = buildWeeklyReviewPrompt(notes, prevReview);
    expect(prompt).toContain("이전 주 리뷰");
    expect(prompt).toContain("집중력 저하 패턴");
  });

  it("omits previous review section when null", () => {
    const notes = [{ date: "2026-03-30", day: "월요일", content: "작업" }];
    const prompt = buildWeeklyReviewPrompt(notes, null);
    expect(prompt).not.toContain("이전 주 리뷰");
  });

  it("contains instruction keywords", () => {
    const notes = [{ date: "2026-03-30", day: "월요일", content: "내용" }];
    const prompt = buildWeeklyReviewPrompt(notes, null);
    expect(prompt).toContain("인사이트");
    expect(prompt).toContain("불릿 포인트");
    expect(prompt).toContain("한국어");
  });
});
