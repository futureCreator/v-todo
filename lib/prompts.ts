import { STAGE_LABELS } from "@/types";
import type { Todo, Schedule } from "@/types";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildBriefingPrompt(todos: Todo[], schedules: Schedule[]): string {
  const today = new Date().toISOString().split("T")[0];

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

  return `당신은 일일 업무 브리핑 도우미입니다.
오늘 날짜: ${today}

## 할 일 목록
${todoList || "(할 일이 없습니다)"}

## D-day / 일정
${scheduleList || "(등록된 일정이 없습니다)"}

위 내용을 종합하여 오늘의 브리핑을 작성해주세요:
1. 오늘 집중해야 할 항목 ("지금" 단계의 할 일 우선)
2. 곧 단계로 넘어갈 위험이 있는 항목 (3일 임박)
3. 다가오는 D-day (14일 이내)
4. 오늘/이번 주 기념일

간결하고 실행 가능한 마크다운 형식으로 응답하세요.`;
}
