import { describe, it, expect } from "vitest";
import { buildBriefingPrompt } from "../prompts";
import type { Todo, Schedule } from "@/types";
import { buildMonthlyReviewPrompt } from "../prompts";
import type { MonthlyReviewInput } from "../prompts";

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

describe("buildMonthlyReviewPrompt", () => {
  const fullInput: MonthlyReviewInput = {
    today: "2026-05-14",
    rangeStart: "2026-04-15",
    days: [
      {
        date: "2026-05-14",
        weekday: "목",
        mood: 4,
        gratitude: ["아침 산책", "점심 맛있었음"],
        note: "오늘은 집중 잘 됨",
      },
      {
        date: "2026-05-13",
        weekday: "수",
        mood: 2,
        gratitude: [],
        note: null,
      },
    ],
    completedTodos: [
      { date: "2026-05-12", title: "프로젝트 마감", stage: "지금" },
    ],
    completedWishes: [
      {
        date: "2026-05-10",
        title: "등산",
        category: "경험",
        satisfaction: 5,
        review: "좋았음",
      },
    ],
  };

  it("includes header with today and range", () => {
    const prompt = buildMonthlyReviewPrompt(fullInput);
    expect(prompt).toContain("오늘 날짜: 2026-05-14");
    expect(prompt).toContain("2026-04-15 ~ 2026-05-14");
  });

  it("renders day sections with mood emoji and gratitude list", () => {
    const prompt = buildMonthlyReviewPrompt(fullInput);
    expect(prompt).toContain("### 2026-05-14 (목)");
    expect(prompt).toContain("mood: 4 😊");
    expect(prompt).toContain("1. 아침 산책");
    expect(prompt).toContain("2. 점심 맛있었음");
    expect(prompt).toContain("note: 오늘은 집중 잘 됨");
  });

  it("omits dimensions that are empty for a given day", () => {
    const prompt = buildMonthlyReviewPrompt(fullInput);
    const day13 = prompt.split("### 2026-05-13")[1]?.split("### ")[0] ?? "";
    expect(day13).toContain("mood: 2 😔");
    expect(day13).not.toContain("gratitude:");
    expect(day13).not.toContain("note:");
  });

  it("truncates notes longer than 3000 chars and marks cut", () => {
    const long = "가".repeat(3500);
    const input: MonthlyReviewInput = {
      ...fullInput,
      days: [{ date: "2026-05-14", weekday: "목", mood: null, gratitude: [], note: long }],
    };
    const prompt = buildMonthlyReviewPrompt(input);
    expect(prompt).toContain("... (잘림)");
    const noteLine = prompt.split("note: ")[1] ?? "";
    expect(noteLine.length).toBeLessThan(3100);
  });

  it("lists completed todos and wishes when present", () => {
    const prompt = buildMonthlyReviewPrompt(fullInput);
    expect(prompt).toContain("## 30일 내 todo 완료");
    expect(prompt).toContain("2026-05-12 · [지금] 프로젝트 마감");
    expect(prompt).toContain("## 30일 내 wish 완료");
    expect(prompt).toContain("2026-05-10 · [경험] 등산 · 만족도 5/5");
    expect(prompt).toContain("리뷰: 좋았음");
  });

  it("omits todo/wish sections when those lists are empty", () => {
    const prompt = buildMonthlyReviewPrompt({
      ...fullInput,
      completedTodos: [],
      completedWishes: [],
    });
    expect(prompt).not.toContain("## 30일 내 todo 완료");
    expect(prompt).not.toContain("## 30일 내 wish 완료");
  });

  it("omits a day section entirely when all dimensions are empty", () => {
    const prompt = buildMonthlyReviewPrompt({
      ...fullInput,
      days: [
        ...fullInput.days,
        { date: "2026-05-12", weekday: "월", mood: null, gratitude: [], note: null },
      ],
    });
    expect(prompt).not.toContain("### 2026-05-12");
  });

  it("includes the system rules and data day count", () => {
    const prompt = buildMonthlyReviewPrompt({
      ...fullInput,
      days: fullInput.days.slice(0, 1),
    });
    expect(prompt).toContain("데이터 일수: 1일");
    expect(prompt).toContain("거울처럼");
    expect(prompt).toContain("존댓말");
  });
});
