import { STAGE_LABELS } from "@/types";
import type { Todo, Schedule } from "@/types";

export interface MonthlyReviewDay {
  date: string;        // YYYY-MM-DD
  weekday: string;     // 월/화/수/...
  mood: number | null; // 1~5
  gratitude: string[]; // 빈 문자열은 호출자가 미리 제거
  note: string | null; // null이면 미작성
}

export interface MonthlyReviewCompletedTodo {
  date: string;
  title: string;
  stage: string; // "지금" | "곧" | "보관함"
}

export interface MonthlyReviewCompletedWish {
  date: string;
  title: string;
  category: string;          // "힐링" | "물건" | "경험"
  satisfaction: number | null;
  review: string | null;
}

export interface MonthlyReviewInput {
  today: string;     // YYYY-MM-DD
  rangeStart: string; // YYYY-MM-DD (today - 29일)
  days: MonthlyReviewDay[]; // 최근 → 과거 정렬된 상태로 호출자가 전달
  completedTodos: MonthlyReviewCompletedTodo[];
  completedWishes: MonthlyReviewCompletedWish[];
}

const MOOD_EMOJI: Record<number, string> = {
  1: "😢", 2: "😔", 3: "😐", 4: "😊", 5: "😄",
};

const NOTE_MAX_CHARS = 3000;

function renderDay(day: MonthlyReviewDay): string | null {
  const lines: string[] = [];
  if (day.mood !== null) {
    lines.push(`- mood: ${day.mood} ${MOOD_EMOJI[day.mood] ?? ""}`.trim());
  }
  const gratitude = day.gratitude.filter((g) => g.trim());
  if (gratitude.length > 0) {
    lines.push("- gratitude:");
    gratitude.forEach((g, i) => lines.push(`  ${i + 1}. ${g}`));
  }
  if (day.note && day.note.trim()) {
    const note = day.note.length > NOTE_MAX_CHARS
      ? day.note.slice(0, NOTE_MAX_CHARS) + "\n... (잘림)"
      : day.note;
    lines.push(`- note: ${note}`);
  }
  if (lines.length === 0) return null;
  return `### ${day.date} (${day.weekday})\n${lines.join("\n")}`;
}

const SYSTEM_RULES = `당신은 사용자의 데이터를 30일 단위로 돌아보는 회고 파트너입니다.
아래 30일치 기록에서 사용자가 스스로 보지 못하는 패턴을 짚어주세요.

규칙:
- 짧은 문단 3~5개로 구성. 각 문단은 ### 헤딩으로 시작.
- 인사, 결론, 총평 금지.
- 각 문단은 "관찰 → 근거 1~2개(날짜 인용) → 짧은 시사" 흐름.
- 다음 차원에서 골고루: mood 추이/주기, 감사 일기에서 반복되는 사람·주제, 노트의 반복 키워드나 감정 변화, 행동(todo/wish 완료)과 mood의 관계.
- 사람 이름이 등장하면 익명화하지 말고 그대로 인용하세요.
- 평가·훈수·격려 금지. 본인이 쓴 내용을 거울처럼 비추기.
- "당신은 ~한 사람" 같은 단정 라벨링 금지.
- 데이터가 너무 적은 차원은 다루지 않고, 억지로 채우지 않음.
- 한국어 존댓말.`;

export function buildMonthlyReviewPrompt(input: MonthlyReviewInput): string {
  const dayCount = input.days.filter(
    (d) => d.mood !== null || d.gratitude.some((g) => g.trim()) || (d.note && d.note.trim())
  ).length;

  const dayBlocks = input.days
    .map(renderDay)
    .filter((s): s is string => s !== null);

  const sections: string[] = [
    `오늘 날짜: ${input.today}`,
    `데이터 일수: ${dayCount}일 (${input.rangeStart} ~ ${input.today})`,
  ];

  if (dayBlocks.length > 0) {
    sections.push(`## 일자별 (최근 → 과거)\n\n${dayBlocks.join("\n\n")}`);
  }

  if (input.completedTodos.length > 0) {
    const todoLines = input.completedTodos
      .map((t) => `- ${t.date} · [${t.stage}] ${t.title}`)
      .join("\n");
    sections.push(`## 30일 내 todo 완료\n${todoLines}`);
  }

  if (input.completedWishes.length > 0) {
    const wishLines = input.completedWishes
      .map((w) => {
        const sat = w.satisfaction !== null ? ` · 만족도 ${w.satisfaction}/5` : "";
        const review = w.review && w.review.trim() ? `\n  리뷰: ${w.review.trim()}` : "";
        return `- ${w.date} · [${w.category}] ${w.title}${sat}${review}`;
      })
      .join("\n");
    sections.push(`## 30일 내 wish 완료\n${wishLines}`);
  }

  return `${SYSTEM_RULES}\n\n${sections.join("\n\n")}\n`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildBriefingPrompt(
  todos: Todo[],
  schedules: Schedule[],
  todayNote?: string,
  yesterdayNote?: string,
  yesterdayDate?: string,
  yesterdayGratitude?: string[],
  recentMoods?: { date: string; value: number }[],
): string {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const todoList = todos
    .map((t) => {
      const stageLabel = STAGE_LABELS[t.stage];
      const daysInStage = Math.floor(
        (Date.now() - new Date(t.stageMovedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return `- [${stageLabel}] ${t.title} (${daysInStage}일째)`;
    })
    .join("\n");

  const scheduleList = schedules
    .map((s) => {
      const d = daysUntil(s.targetDate);
      const prefix = d < 0 ? `D+${Math.abs(d)}` : d === 0 ? "D-day" : `D-${d}`;
      const typeLabel = s.type === "anniversary" ? "기념일" : "일정";
      return `- [D-day/${typeLabel}] ${s.name} (${prefix}, ${s.targetDate})`;
    })
    .join("\n");

  const noteSections: string[] = [];
  if (todayNote?.trim()) {
    noteSections.push(`## 오늘의 데일리 노트 (${today})\n${todayNote.trim()}`);
  }
  if (yesterdayNote?.trim()) {
    noteSections.push(`## 어제의 데일리 노트 (${yesterdayDate})\n${yesterdayNote.trim()}`);
  }
  const dailyNoteBlock = noteSections.length > 0 ? "\n" + noteSections.join("\n\n") + "\n" : "";

  const gratitudeSection = yesterdayGratitude && yesterdayGratitude.some((s) => s.trim())
    ? `\n## 어제의 감사\n${yesterdayGratitude.filter((s) => s.trim()).map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`
    : "";

  const moodEmojis: Record<number, string> = { 1: "😢", 2: "😔", 3: "😐", 4: "😊", 5: "😄" };
  const moodSection = recentMoods && recentMoods.length > 0
    ? `\n## 최근 기분 추이\n${recentMoods.map((m) => `- ${m.date}: ${moodEmojis[m.value] ?? "?"}`).join("\n")}\n`
    : "";

  const reqItems: string[] = [
    "1. 오늘 집중해야 할 항목 (\"지금\" 단계의 할 일 우선)",
    "2. 곧 단계로 넘어갈 위험이 있는 항목 (3일 임박)",
    "3. 다가오는 D-day (14일 이내)",
    "4. 오늘/이번 주 기념일",
  ];
  let reqNum = 5;
  if (dailyNoteBlock) {
    reqItems.push(`${reqNum}. 데일리 노트에 적힌 내용 중 오늘 브리핑에 참고할 만한 사항`);
    reqNum++;
  }
  if (gratitudeSection) {
    reqItems.push(`${reqNum}. 어제 감사했던 것을 리마인드하여 긍정적으로 하루 시작`);
    reqNum++;
  }
  if (moodSection) {
    reqItems.push(`${reqNum}. 최근 기분 추이를 분석하고, 3일 이상 하락세면 격려 메시지 포함`);
    reqNum++;
  }

  return `당신은 일일 업무 브리핑 도우미입니다.
오늘 날짜: ${today}

## 할 일 목록
${todoList || "(할 일이 없습니다)"}

## D-day / 일정
${scheduleList || "(등록된 일정이 없습니다)"}
${dailyNoteBlock}${gratitudeSection}${moodSection}
위 내용을 종합하여 오늘의 브리핑을 작성해주세요:
${reqItems.join("\n")}

간결하고 실행 가능한 마크다운 형식으로 응답하세요.`;
}
