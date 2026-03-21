export type Quadrant =
  | "urgent-important"
  | "urgent-not-important"
  | "not-urgent-important"
  | "not-urgent-not-important";

export interface Todo {
  id: string;
  title: string;
  quadrant: Quadrant;
  completed: boolean;
  aiGenerated: boolean;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TodoStore {
  todos: Todo[];
}

export interface CreateTodoRequest {
  title: string;
  quadrant: Quadrant;
  dueDate?: string | null;
  aiGenerated?: boolean;
}

export interface UpdateTodoRequest {
  title?: string;
  quadrant?: Quadrant;
  completed?: boolean;
  dueDate?: string | null;
}

export interface AiSuggestRequest {
  quadrant: Quadrant;
}

export interface AiSuggestResponse {
  suggestions: { title: string; dueDate: string | null }[];
}

export interface AiCleanupRequest {
  quadrant: Quadrant;
}

export interface AiCleanupChange {
  type: "edit" | "merge" | "delete";
  originalIds: string[];
  newTitle: string | null;
  dueDate?: string | null;
}

export interface AiCleanupResponse {
  changes: AiCleanupChange[];
}

export interface AiCleanupApplyRequest {
  quadrant: Quadrant;
  changes: AiCleanupChange[];
}

export interface AiBriefingResponse {
  briefing: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  "urgent-important": "지금 하기",
  "urgent-not-important": "위임하기",
  "not-urgent-important": "계획하기",
  "not-urgent-not-important": "나중에",
};

export const QUADRANT_ORDER: Quadrant[] = [
  "urgent-important",
  "not-urgent-important",
  "urgent-not-important",
  "not-urgent-not-important",
];
