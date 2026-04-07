"use client";

import { useState } from "react";
import type { Link } from "@/types";
import { extractTags } from "@/lib/tags";

interface LinkCardProps {
  link: Link;
  onToggleRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

/* -------------------------------------------------------- helpers --- */

// Combined regex used to split memo into renderable segments.
const SPLIT_REGEX = /(https?:\/\/[^\s]+|#[^\s#]+)/g;

type Segment =
  | { type: "text"; value: string }
  | { type: "url"; value: string }
  | { type: "tag"; value: string };

function splitMemo(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(SPLIT_REGEX)) {
    const i = match.index!;
    if (i > last) out.push({ type: "text", value: text.slice(last, i) });
    const v = match[0];
    if (v.startsWith("#")) out.push({ type: "tag", value: v.slice(1) });
    else out.push({ type: "url", value: v });
    last = i + v.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "방금";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 86400 * 2) return "어제";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ---------------------------------------------------- component --- */

export default function LinkCard({
  link,
  onToggleRead,
  onDelete,
  onTagClick,
}: LinkCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const segments = splitMemo(link.memo);
  const tagChips = extractTags(link.memo);
  const additionalUrls = link.urls.length - 1;

  const openUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCardClick = () => {
    if (link.urls.length > 0) openUrl(link.urls[0]);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = link.urls[0];
    const shareData = { text: link.memo, url };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${link.memo}\n${url}`);
      // Toast handled by parent? For first version: no toast — just silent copy.
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleCardClick();
      }}
      className={`relative rounded-2xl bg-[var(--sys-bg-elevated)] p-4 cursor-pointer transition-colors hover:bg-[var(--fill-quaternary)] ${
        link.read ? "opacity-60" : ""
      }`}
    >
      {/* Memo body — Body 20px */}
      <div className="text-[20px] leading-[26px] text-[var(--label-primary)] whitespace-pre-wrap break-words">
        {segments.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.value}</span>;
          if (seg.type === "url") {
            return (
              <a
                key={i}
                href={seg.value}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--accent-primary)] underline underline-offset-2 break-all"
              >
                {seg.value}
              </a>
            );
          }
          // tag
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(seg.value);
              }}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] text-[15px] font-medium leading-tight align-baseline"
            >
              #{seg.value}
            </button>
          );
        })}
      </div>

      {/* Hashtag chip row (in addition to inline chips, for quick scanning) — Subheadline 17px */}
      {tagChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tagChips.map((tag) => (
            <button
              key={tag}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] text-[15px] font-medium"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Domain + relative time — Footnote 15px */}
      <div className="mt-2 flex items-center gap-2 text-[15px] text-[var(--label-tertiary)]">
        <span aria-hidden>🌐</span>
        <span className="truncate">{link.primaryDomain || "(no domain)"}</span>
        {additionalUrls > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-[var(--fill-quaternary)] text-[13px]">
            +{additionalUrls}
          </span>
        )}
        <span>·</span>
        <span>{relativeTime(link.createdAt)}</span>
      </div>

      {/* Action row */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleRead(link.id, !link.read);
          }}
          className="px-3 py-1.5 rounded-lg bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] active:opacity-70"
          aria-label={link.read ? "안 읽음으로" : "읽음으로"}
        >
          {link.read ? "↩ 안 읽음" : "✓ 읽음"}
        </button>
        <button
          onClick={handleShare}
          className="px-3 py-1.5 rounded-lg bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] active:opacity-70"
          aria-label="공유"
        >
          📤 공유
        </button>
        {confirmDelete ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(link.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--sys-red)] text-white text-[15px] font-semibold active:opacity-70"
            >
              삭제
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] active:opacity-70"
            >
              취소
            </button>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-[var(--fill-quaternary)] text-[15px] text-[var(--label-primary)] active:opacity-70"
            aria-label="삭제"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}
