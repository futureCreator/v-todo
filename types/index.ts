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

// Notes
export type Section = "todo" | "note" | "checkin" | "wish" | "dday";
export type NoteTab = "daily" | "general" | "mood";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  modifiedAt: string;
}

// Wishes
export type WishCategory = "healing" | "item" | "experience";

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
  actualPrice: number | null;
  satisfaction: number | null;
  review: string | null;
  healingType?: "image" | "text" | "link";
  linkTitle?: string;
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
  healingType?: "image" | "text" | "link";
  linkTitle?: string;
}

export interface UpdateWishRequest {
  title?: string;
  category?: WishCategory;
  price?: number | null;
  url?: string | null;
  imageUrl?: string | null;
  memo?: string | null;
  completed?: boolean;
  completedAt?: string | null;
  actualPrice?: number | null;
  satisfaction?: number | null;
  review?: string | null;
  healingType?: "image" | "text" | "link";
  linkTitle?: string;
}

export type TodoTab = "now" | "soon" | "archive";

// Gratitude
export interface GratitudeEntry {
  date: string;
  items: [string, string, string, string, string];
}

export interface GratitudeStore {
  entries: GratitudeEntry[];
}

// Mood
export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodMap = Record<string, MoodValue>;

