"use client";

import { useState, useRef } from "react";
import type { FileItem } from "@/types";

interface FileListItemProps {
  item: FileItem;
  onOpen: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

function formatModifiedAt(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

export default function FileListItem({
  item,
  onOpen,
  onRename,
  onDelete,
}: FileListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.name);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => {
      setShowMenu(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== item.name) {
      onRename(trimmed);
    }
    setIsRenaming(false);
    setShowMenu(false);
  };

  const startRename = () => {
    setRenameValue(item.name);
    setIsRenaming(true);
    setShowMenu(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const displayName = item.type === "file"
    ? item.name.replace(/\.md$/, "")
    : item.name;

  if (isRenaming) {
    return (
      <div className="flex items-center gap-3 px-5 md:px-0 py-3">
        <div className="size-8 flex items-center justify-center text-[var(--label-tertiary)]">
          {item.type === "directory" ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <path d="M3 4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-7l-2-2H3z" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 3h8l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
              <polyline points="13 3 13 7 17 7" />
            </svg>
          )}
        </div>
        <input
          ref={inputRef}
          className="flex-1 bg-[var(--fill-quaternary)] rounded-lg px-3 py-2 text-[20px] text-[var(--label-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameSubmit();
            if (e.key === "Escape") setIsRenaming(false);
          }}
          onBlur={handleRenameSubmit}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="w-full flex items-center gap-3 px-5 md:px-0 py-3 active:bg-[var(--fill-quaternary)] transition-colors text-left"
        onClick={onOpen}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        <div className="size-8 flex items-center justify-center text-[var(--label-tertiary)]">
          {item.type === "directory" ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="var(--accent-primary)" opacity="0.8">
              <path d="M3 4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-7l-2-2H3z" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 3h8l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
              <polyline points="13 3 13 7 17 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[20px] text-[var(--label-primary)] truncate block">
            {displayName}
          </span>
          <span className="text-[15px] text-[var(--label-tertiary)]">
            {formatModifiedAt(item.modifiedAt)}
          </span>
        </div>
        {item.type === "directory" && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--label-quaternary)" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 3 11 8 6 13" />
          </svg>
        )}
      </button>

      {/* Context Menu Overlay */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-2 z-50 bg-[var(--bg-elevated)] rounded-xl border border-[var(--separator)] shadow-lg overflow-hidden min-w-[160px]">
            <button
              className="w-full px-4 py-3 text-left text-[17px] text-[var(--label-primary)] active:bg-[var(--fill-quaternary)] transition-colors"
              onClick={startRename}
            >
              이름 변경
            </button>
            <div className="h-px bg-[var(--separator)]" />
            <button
              className="w-full px-4 py-3 text-left text-[17px] text-[var(--system-red)] active:bg-[var(--fill-quaternary)] transition-colors"
              onClick={() => {
                setShowMenu(false);
                onDelete();
              }}
            >
              삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}
