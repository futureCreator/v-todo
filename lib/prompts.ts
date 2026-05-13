import { STAGE_LABELS } from "@/types";
import type { Todo, Schedule } from "@/types";

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
