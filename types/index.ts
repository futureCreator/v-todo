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

export interface WeeklyReviewResponse {
  path: string;
  content: string;
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
export type Section = "todo" | "note" | "wish" | "dday";
export type NoteTab = "daily" | "general";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  modifiedAt: string;
}

// Wishes
export type WishCategory = "item" | "experience";

export interface WishItem {
  id: string;
  title: string;
  category: WishCategory;
  price: number | null;
  url: string | null;
  imageUrl: string | null;
  memo: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface WishStore {
  wishes: WishItem[];
}

export interface CreateWishRequest {
  title: string;
  category: WishCategory;
  price?: number | null;
  url?: string | null;
  imageUrl?: string | null;
  memo?: string | null;
}

export interface UpdateWishRequest {
  title?: string;
  category?: WishCategory;
  price?: number | null;
  url?: string | null;
  imageUrl?: string | null;
  memo?: string | null;
  completed?: boolean;
}

export const VALID_WISH_CATEGORIES: WishCategory[] = ["item", "experience"];
