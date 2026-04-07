"use client";

import type { Todo, Schedule, WishItem } from "@/types";
import { extractTags } from "@/lib/tags";
import { getDisplayInfo } from "@/components/ScheduleItem";

interface TagViewProps {
  tag: string;
  todos: Todo[];
  schedules: Schedule[];
  wishes: WishItem[];
  onClose: () => void;
}

function ddayLabel(days: number): string {
  if (days === 0) return "D-Day";
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

export default function TagView({ tag, todos, schedules, wishes, onClose }: TagViewProps) {
  const matchedTodos = todos.filter(
    (t) => !t.completed && extractTags(t.title).includes(tag)
  );
  const matchedSchedules = schedules.filter((s) =>
    extractTags(s.name).includes(tag)
  );
  const matchedWishes = wishes.filter(
    (w) => !w.completed && extractTags(w.title).includes(tag)
  );

  const totalCount = matchedTodos.length + matchedSchedules.length + matchedWishes.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-lg md:max-h-[70vh] max-h-[85vh] bg-[var(--sys-bg-elevated)] md:rounded-2xl rounded-t-[16px] flex flex-col ios-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drag-handle md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-b border-[var(--separator)]">
          <div className="w-[60px]" />
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] text-[17px] font-semibold">
              #{tag}
            </span>
          </div>
          <button
            className="w-[60px] text-right text-[20px] text-[var(--accent-primary)] active:opacity-60"
            onClick={onClose}
          >
            완료
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--label-tertiary)]">
              <span className="text-[56px] mb-5 opacity-30">#</span>
              <p className="text-[20px]">이 태그를 사용하는 항목이 없습니다</p>
            </div>
          ) : (
            <div className="py-3">
              {/* Todos */}
              {matchedTodos.length > 0 && (
                <section className="mb-4">
                  <h3 className="px-5 text-[13px] font-semibold text-[var(--label-tertiary)] uppercase tracking-wide mb-2">
                    할 일 {matchedTodos.length}
                  </h3>
                  <div className="mx-4 flex flex-col gap-1.5">
                    {matchedTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--fill-quaternary)]"
                      >
                        <span className="w-[18px] h-[18px] rounded-full border-2 border-[var(--sys-gray)] flex-shrink-0" />
                        <span className="text-[17px] text-[var(--label-primary)] flex-1 truncate">
                          {todo.title.replace(/#[^\s#]+/g, "").trim()}
                        </span>
                        <span className="text-[13px] text-[var(--label-quaternary)] flex-shrink-0">
                          {todo.stage === "now" ? "지금" : "곧"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Wishes */}
              {matchedWishes.length > 0 && (
                <section className="mb-4">
                  <h3 className="px-5 text-[13px] font-semibold text-[var(--label-tertiary)] uppercase tracking-wide mb-2">
                    위시리스트 {matchedWishes.length}
                  </h3>
                  <div className="mx-4 flex flex-col gap-1.5">
                    {matchedWishes.map((wish) => (
                      <div
                        key={wish.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--fill-quaternary)]"
                      >
                        <span className="text-[16px] flex-shrink-0">
                          {wish.category === "item" ? "🛍️" : "⭐"}
                        </span>
                        <span className="text-[17px] text-[var(--label-primary)] flex-1 truncate">
                          {wish.title.replace(/#[^\s#]+/g, "").trim()}
                        </span>
                        {wish.price != null && (
                          <span className="text-[13px] text-[var(--accent-primary)] font-medium flex-shrink-0">
                            {wish.price.toLocaleString("ko-KR")}원
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Schedules */}
              {matchedSchedules.length > 0 && (
                <section className="mb-4">
                  <h3 className="px-5 text-[13px] font-semibold text-[var(--label-tertiary)] uppercase tracking-wide mb-2">
                    D-day {matchedSchedules.length}
                  </h3>
                  <div className="mx-4 flex flex-col gap-1.5">
                    {matchedSchedules.map((schedule) => {
                      const { daysLeft } = getDisplayInfo(schedule);
                      return (
                        <div
                          key={schedule.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--fill-quaternary)]"
                        >
                          <span className="text-[16px] flex-shrink-0">📅</span>
                          <span className="text-[17px] text-[var(--label-primary)] flex-1 truncate">
                            {schedule.name.replace(/#[^\s#]+/g, "").trim()}
                          </span>
                          <span className={`text-[15px] font-bold flex-shrink-0 ${
                            daysLeft <= 14 ? "text-[var(--system-red)]" : "text-[var(--accent-primary)]"
                          }`}>
                            {ddayLabel(daysLeft)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
