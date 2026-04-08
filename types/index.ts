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
export type Section = "todo" | "note" | "link" | "wish" | "dday";
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

export const VALID_WISH_CATEGORIES: WishCategory[] = ["healing", "item", "experience"];

// Habits
export type HabitRepeatMode = "daily" | "weekdays" | "interval";
export type TodoTab = "now" | "soon" | "habit";

export interface Habit {
  id: string;
  title: string;
  repeatMode: HabitRepeatMode;
  weekdays: number[];
  intervalDays: number;
  createdAt: string;
}

export interface HabitStore {
  habits: Habit[];
}

export interface HabitLog {
  habitId: string;
  date: string;
  completed: boolean;
}

export interface HabitLogStore {
  logs: HabitLog[];
}

export interface CreateHabitRequest {
  title: string;
  repeatMode?: HabitRepeatMode;
  weekdays?: number[];
  intervalDays?: number;
}

export interface UpdateHabitRequest {
  title?: string;
  repeatMode?: HabitRepeatMode;
  weekdays?: number[];
  intervalDays?: number;
}

export const VALID_HABIT_REPEAT_MODES: HabitRepeatMode[] = ["daily", "weekdays", "interval"];

// Gratitude
export interface GratitudeEntry {
  date: string;
  items: [string, string, string];
}

export interface GratitudeStore {
  entries: GratitudeEntry[];
}

// Mood
export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodMap = Record<string, MoodValue>;

// Links
export interface Link {
  id: string;
  /** Original Telegram message text. URL(s) and hashtags are kept inline. */
  memo: string;
  /** All URLs extracted from the message, in original order. First is the primary. */
  urls: string[];
  /** Domain of the first URL (e.g. "x.com"). Cached at save time for cheap rendering. */
  primaryDomain: string;
  /** Read state. False = inbox, true = archived/read. */
  read: boolean;
  /** Source channel. Always "telegram" in v1; slot kept for future expansion. */
  source: "telegram" | "manual";
  /** Telegram message ID — used for dedupe (idempotency). Optional because manual entries won't have one. */
  telegramMessageId?: number;
  /** ISO 8601 instant. */
  createdAt: string;
  /** ISO 8601 instant. Set when `read` flips to true, cleared (undefined) when flipped back. */
  readAt?: string;
}

export interface LinkStore {
  links: Link[];
  /** The last Telegram update_id that was processed. Used as the next `getUpdates?offset=`. */
  lastUpdateId?: number;
}
