// types/index.ts

export type Stage = "now" | "soon" | "archive";

export interface Todo {
  id: string;
  title: string;
  stage: Stage;
  completed: boolean;
  aiGenerated: boolean;
  createdAt: string;
  stageMovedAt: string;
  completedAt: string | null;
}

export interface TodoStore {
  todos: Todo[];
}

export interface CreateTodoRequest {
  title: string;
  aiGenerated?: boolean;
}

export interface UpdateTodoRequest {
  title?: string;
  completed?: boolean;
}

export type ScheduleType = "general" | "anniversary";
export type RepeatMode = "none" | "every_100_days" | "monthly" | "yearly";

export interface Schedule {
  id: string;
  name: string;
  targetDate: string;
  originDate: string;
  type: ScheduleType;
  repeatMode: RepeatMode;
  isLunar: boolean;
  lunarMonth: number | null;
  lunarDay: number | null;
  createdAt: string;
}

export interface ScheduleStore {
  schedules: Schedule[];
}

export interface CreateScheduleRequest {
  name: string;
  targetDate: string;
  originDate: string;
  type: ScheduleType;
  repeatMode: RepeatMode;
  isLunar: boolean;
  lunarMonth?: number | null;
  lunarDay?: number | null;
}

export interface UpdateScheduleRequest {
  name?: string;
  targetDate?: string;
  originDate?: string;
  type?: ScheduleType;
  repeatMode?: RepeatMode;
  isLunar?: boolean;
  lunarMonth?: number | null;
  lunarDay?: number | null;
}

export interface AiBriefingResponse {
  briefing: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const STAGE_LABELS: Record<Stage, string> = {
  now: "지금",
  soon: "곧",
  archive: "보관함",
};

export const VALID_STAGES: Stage[] = ["now", "soon", "archive"];
export const VALID_SCHEDULE_TYPES: ScheduleType[] = ["general", "anniversary"];
export const VALID_REPEAT_MODES: RepeatMode[] = ["none", "every_100_days", "monthly", "yearly"];

// Notes
export type Section = "todo" | "note" | "dday";
export type NoteTab = "daily" | "general";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  modifiedAt: string;
}
