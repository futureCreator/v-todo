import { QUADRANT_LABELS } from "@/types";
import type { Quadrant, Todo } from "@/types";

export function buildSuggestPrompt(quadrant: Quadrant, todos: Todo[]): string {
  const label = QUADRANT_LABELS[quadrant];
  const list = todos.map((t) => `- ${t.title}${t.dueDate ? ` (마감: ${t.dueDate})` : ""}`).join("\n");

  return `당신은 할 일 관리 도우미입니다.
아래는 아이젠하워 매트릭스의 "${label}" 분면에 있는 현재 할 일 목록입니다:

${list || "(비어 있음)"}

이 목록을 보고 빠져 있을 수 있는 할 일을 3~5개 제안해주세요.
반드시 아래 JSON 형식으로만 응답하세요:
[{"title": "할 일 제목", "dueDate": "YYYY-MM-DD" 또는 null}]`;
}

export function buildCleanupPrompt(todos: Todo[]): string {
  const list = todos.map((t) => `- [${t.id}] ${t.title}`).join("\n");

  return `당신은 할 일 정리 도우미입니다.
아래는 할 일 목록입니다:

${list}

중복 제거, 문장 다듬기, 유사 항목 병합을 제안해주세요.
반드시 아래 JSON 형식으로만 응답하세요:
[{"type": "edit"|"merge"|"delete", "originalIds": ["id1"], "newTitle": "정리된 제목" 또는 null, "dueDate": "YYYY-MM-DD" 또는 null}]`;
}

export function buildBriefingPrompt(todos: Todo[]): string {
  const today = new Date().toISOString().split("T")[0];
  const list = todos
    .map(
      (t) =>
        `- [${QUADRANT_LABELS[t.quadrant]}] ${t.title}${t.dueDate ? ` (마감: ${t.dueDate})` : ""}`
    )
    .join("\n");

  return `당신은 일일 업무 브리핑 도우미입니다.
오늘 날짜: ${today}

아래는 사용자의 전체 미완료 할 일 목록입니다:
${list || "(할 일이 없습니다)"}

오늘 집중해야 할 항목을 우선순위별로 정리하고,
마감이 임박하거나 지난 항목을 강조해서 간결한 브리핑을 작성해주세요.
마크다운 형식으로 응답하세요.`;
}
