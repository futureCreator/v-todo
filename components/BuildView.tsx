"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { KanbanCard, KanbanColumn } from "@/types";
import { KANBAN_COLUMN_LABELS, KANBAN_COLUMNS } from "@/types";
import SectionTabs from "@/components/SectionTabs";
import { haptic } from "@/lib/haptic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const COLUMNS = KANBAN_COLUMNS;

const COLUMN_ACCENT: Record<KanbanColumn, string> = {
  idea: "var(--sys-purple)",
  dev: "var(--sys-blue)",
  review: "var(--sys-orange)",
  release: "var(--sys-green)",
};

function useFinePointer() {
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return finePointer;
}

interface KanbanCardItemProps {
  card: KanbanCard;
  columnIndex: number;
  draggable: boolean;
  onMove: (id: string, column: KanbanColumn) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function KanbanCardItem({
  card,
  columnIndex,
  draggable,
  onMove,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
  isDragging,
}: KanbanCardItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(card.title);
  }, [card.title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== card.title) {
      onEdit(card.id, trimmed);
    } else {
      setEditTitle(card.title);
    }
    setEditing(false);
  };

  const movePrev = () => {
    if (columnIndex > 0) {
      haptic.selection();
      onMove(card.id, COLUMNS[columnIndex - 1]);
    }
  };

  const moveNext = () => {
    if (columnIndex < COLUMNS.length - 1) {
      haptic.selection();
      onMove(card.id, COLUMNS[columnIndex + 1]);
    }
  };

  return (
    <div
      draggable={draggable && !editing}
      onDragStart={() => onDragStart(card.id)}
      onDragEnd={onDragEnd}
      className={`group rounded-xl bg-[var(--bg-elevated)] border border-[var(--separator)] shadow-[var(--shadow-xs)] transition-opacity ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="p-3.5">
        {editing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") {
                setEditTitle(card.title);
                setEditing(false);
              }
            }}
            className="w-full text-[20px] text-[var(--label-primary)] bg-transparent outline-none"
          />
        ) : (
          <button
            type="button"
            className="w-full text-left text-[20px] text-[var(--label-primary)] leading-snug"
            onClick={() => {
              haptic.selection();
              setEditing(true);
            }}
          >
            {card.title}
          </button>
        )}
      </div>
      {!editing && (
        <div className="flex items-center justify-between px-1.5 pb-2 max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <div className="flex gap-0.5">
            <button
              type="button"
              aria-label="이전 단계로"
              disabled={columnIndex === 0}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-[var(--label-tertiary)] disabled:opacity-30 active:bg-[var(--fill-quaternary)]"
              onClick={movePrev}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M10 4L6 8l4 4" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="다음 단계로"
              disabled={columnIndex === COLUMNS.length - 1}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-[var(--label-tertiary)] disabled:opacity-30 active:bg-[var(--fill-quaternary)]"
              onClick={moveNext}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 4l4 4-4 4" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            aria-label="삭제"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-[var(--label-tertiary)] active:bg-[var(--fill-quaternary)]"
            onClick={() => {
              haptic.tap();
              onDelete(card.id);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 4h10M6 4V3h4v1M5 4v8.5h6V4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

interface KanbanColumnViewProps {
  column: KanbanColumn;
  columnIndex: number;
  cards: KanbanCard[];
  dragOver: boolean;
  draggable: boolean;
  layout: "mobile" | "desktop";
  onAdd: (column: KanbanColumn, title: string) => void;
  onMove: (id: string, column: KanbanColumn) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (column: KanbanColumn) => void;
  onDrop: (column: KanbanColumn) => void;
  draggingId: string | null;
}

function KanbanColumnView({
  column,
  columnIndex,
  cards,
  dragOver,
  draggable,
  layout,
  onAdd,
  onMove,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggingId,
}: KanbanColumnViewProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const submitAdd = () => {
    const trimmed = newTitle.trim();
    if (trimmed) {
      onAdd(column, trimmed);
      setNewTitle("");
      setAdding(false);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl bg-[var(--fill-quaternary)] transition-colors ${
        layout === "mobile" ? "flex-1 min-h-0 w-full" : "min-h-0 h-full"
      } ${dragOver ? "ring-2 ring-[var(--accent-primary)]/40" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(column);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(column);
      }}
    >
      {layout === "desktop" && (
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: COLUMN_ACCENT[column] }}
          />
          <h3 className="text-[17px] font-semibold text-[var(--label-secondary)] flex-1">
            {KANBAN_COLUMN_LABELS[column]}
          </h3>
          <span className="text-[17px] text-[var(--label-tertiary)] tabular-nums">
            {cards.length}
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 px-3 md:px-2 pb-2 flex flex-col gap-2.5 overflow-y-auto overscroll-contain touch-pan-y">
        {cards.length === 0 && !adding && (
          <div className="flex-1 flex items-center justify-center py-8 text-[17px] text-[var(--label-quaternary)]">
            카드가 없습니다
          </div>
        )}
        {cards.map((card) => (
          <KanbanCardItem
            key={card.id}
            card={card}
            columnIndex={columnIndex}
            draggable={draggable}
            onMove={onMove}
            onDelete={onDelete}
            onEdit={onEdit}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingId === card.id}
          />
        ))}
      </div>

      <div className="px-3 md:px-2 pb-3 shrink-0">
        {adding ? (
          <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--separator)] p-3">
            <textarea
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="카드 제목"
              rows={2}
              className="w-full text-[20px] text-[var(--label-primary)] bg-transparent outline-none resize-none placeholder:text-[var(--label-quaternary)]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitAdd();
                }
                if (e.key === "Escape") {
                  setNewTitle("");
                  setAdding(false);
                }
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                className="flex-1 min-h-[44px] rounded-xl bg-[var(--accent-primary)] text-white text-[17px] font-semibold active:opacity-80"
                onClick={submitAdd}
              >
                추가
              </button>
              <button
                type="button"
                className="min-h-[44px] px-4 rounded-xl text-[var(--label-secondary)] text-[17px] active:bg-[var(--fill-quaternary)]"
                onClick={() => {
                  setNewTitle("");
                  setAdding(false);
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="w-full min-h-[44px] py-2.5 rounded-xl text-[17px] font-medium text-[var(--label-tertiary)] active:bg-[var(--fill-tertiary)] transition-colors flex items-center justify-center gap-1.5"
            onClick={() => {
              haptic.selection();
              setAdding(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="7" y1="2" x2="7" y2="12" />
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
            카드 추가
          </button>
        )}
      </div>
    </div>
  );
}

export default function BuildView() {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileColumn, setMobileColumn] = useState<KanbanColumn>("idea");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);
  const finePointer = useFinePointer();
  const touchRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/build`);
      const body = await res.json();
      if (body.data) setCards(body.data);
    } catch (err) {
      console.error("Failed to fetch build cards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const cardsForColumn = (column: KanbanColumn) =>
    cards.filter((c) => c.column === column).sort((a, b) => a.order - b.order);

  const columnTabs = COLUMNS.map((col) => {
    const count = cardsForColumn(col).length;
    return {
      key: col,
      label: `${KANBAN_COLUMN_LABELS[col]}${count > 0 ? ` ${count}` : ""}`,
    };
  });

  const addCard = async (column: KanbanColumn, title: string) => {
    haptic.tap();
    try {
      const res = await fetch(`${BASE}/api/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, column }),
      });
      const body = await res.json();
      if (body.data) setCards((prev) => [...prev, body.data]);
    } catch (err) {
      console.error("Failed to add card:", err);
    }
  };

  const moveCard = async (id: string, column: KanbanColumn) => {
    const card = cards.find((c) => c.id === id);
    if (!card || card.column === column) return;

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, column } : c))
    );

    try {
      await fetch(`${BASE}/api/build/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column }),
      });
    } catch (err) {
      console.error("Failed to move card:", err);
      fetchCards();
    }
  };

  const editCard = async (id: string, title: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
    try {
      await fetch(`${BASE}/api/build/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      console.error("Failed to edit card:", err);
      fetchCards();
    }
  };

  const deleteCard = async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`${BASE}/api/build/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete card:", err);
      fetchCards();
    }
  };

  const handleDrop = (column: KanbanColumn) => {
    if (draggingId) {
      moveCard(draggingId, column);
    }
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const onMobileTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const onMobileTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    touchRef.current = null;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
      const idx = COLUMNS.indexOf(mobileColumn);
      if (dx < 0 && idx < COLUMNS.length - 1) {
        haptic.selection();
        setMobileColumn(COLUMNS[idx + 1]);
      }
      if (dx > 0 && idx > 0) {
        haptic.selection();
        setMobileColumn(COLUMNS[idx - 1]);
      }
    }
  };

  const columnProps = (column: KanbanColumn, columnIndex: number, layout: "mobile" | "desktop") => ({
    column,
    columnIndex,
    cards: cardsForColumn(column),
    dragOver: dragOverColumn === column,
    draggable: finePointer,
    layout,
    onAdd: addCard,
    onMove: moveCard,
    onDelete: deleteCard,
    onEdit: editCard,
    onDragStart: setDraggingId,
    onDragEnd: () => {
      setDraggingId(null);
      setDragOverColumn(null);
    },
    onDragOver: setDragOverColumn,
    onDrop: handleDrop,
    draggingId,
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--label-tertiary)] text-[20px]">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 md:px-8">
      {/* Mobile: column tabs + single full-width column */}
      <div
        className="md:hidden flex-1 flex flex-col min-h-0"
        onTouchStart={onMobileTouchStart}
        onTouchEnd={onMobileTouchEnd}
      >
        <SectionTabs
          tabs={columnTabs}
          active={mobileColumn}
          onChange={(key) => {
            haptic.selection();
            setMobileColumn(key as KanbanColumn);
          }}
        />
        <div className="flex-1 min-h-0 px-5 pb-2 flex flex-col">
          <KanbanColumnView
            {...columnProps(mobileColumn, COLUMNS.indexOf(mobileColumn), "mobile")}
          />
        </div>
      </div>

      {/* Desktop: 3-column board */}
      <div className="hidden md:flex flex-1 min-h-0 pb-4 gap-4">
        {COLUMNS.map((column, columnIndex) => (
          <div key={column} className="flex-1 min-w-0 flex flex-col min-h-0">
            <KanbanColumnView
              {...columnProps(column, columnIndex, "desktop")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
