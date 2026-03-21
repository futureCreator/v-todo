"use client";

import { useState } from "react";
import type { AiCleanupChange } from "@/types";

interface AiCleanupDiffProps {
  changes: AiCleanupChange[];
  onApply: (accepted: AiCleanupChange[]) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  edit: "수정",
  merge: "병합",
  delete: "삭제",
};

const TYPE_COLORS: Record<string, string> = {
  edit: "var(--sys-blue)",
  merge: "var(--sys-orange)",
  delete: "var(--sys-red)",
};

export default function AiCleanupDiff({ changes, onApply, onClose }: AiCleanupDiffProps) {
  const [accepted, setAccepted] = useState<boolean[]>(changes.map(() => true));

  const toggle = (i: number) => {
    setAccepted((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const selectedCount = accepted.filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay"
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="ios-sheet w-full max-w-md max-h-[70vh] flex flex-col rounded-t-[16px] md:rounded-[16px]"
        style={{
          background: "var(--sys-bg-elevated)",
          boxShadow: "var(--shadow-xl)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
        }}
      >
        <div className="drag-handle md:hidden" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-[14px]"
          style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
        >
          <button
            onClick={onClose}
            className="text-[16px] active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            취소
          </button>
          <div className="flex items-center gap-[6px]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4h12M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3.5 4l.7 9.1a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-9.1"
                stroke="var(--ai-from)"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--sys-label)" }}>
              AI 정리
            </h3>
          </div>
          <button
            onClick={() => onApply(changes.filter((_, i) => accepted[i]))}
            disabled={selectedCount === 0}
            className="text-[16px] font-semibold disabled:opacity-30 active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            적용
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {changes.length === 0 && (
            <p className="text-[15px] text-center py-12" style={{ color: "var(--sys-label-tertiary)" }}>
              정리할 항목이 없습니다.
            </p>
          )}
          {changes.map((c, i) => (
            <div key={i} className={`item-enter stagger-${Math.min(i + 1, 10)}`}>
              {i > 0 && (
                <div
                  className="ml-[52px] mr-5"
                  style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
                />
              )}
              <label className="flex items-start gap-[12px] px-5 py-[12px] min-h-[44px] cursor-pointer active:bg-[var(--sys-fill-quaternary)] transition-colors">
                <div
                  className="w-[22px] h-[22px] rounded-[7px] flex-shrink-0 flex items-center justify-center mt-[1px] transition-all"
                  style={{
                    backgroundColor: accepted[i] ? "var(--sys-blue)" : "transparent",
                    border: accepted[i] ? "none" : "2px solid var(--sys-separator-opaque)",
                  }}
                >
                  {accepted[i] && (
                    <svg width="11" height="9" viewBox="0 0 12 10" fill="none" className="check-pop">
                      <path
                        d="M1 5L4.5 8.5L11 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={accepted[i]}
                  onChange={() => toggle(i)}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  {/* Type badge */}
                  <span
                    className="inline-flex items-center text-[11px] font-bold uppercase px-[6px] py-[2px] rounded-[5px]"
                    style={{
                      color: TYPE_COLORS[c.type],
                      backgroundColor: `color-mix(in srgb, ${TYPE_COLORS[c.type]} 12%, transparent)`,
                    }}
                  >
                    {TYPE_LABELS[c.type]}
                  </span>
                  {c.newTitle && (
                    <p className="text-[15px] leading-[20px] mt-[5px]" style={{ color: "var(--sys-label)" }}>
                      {c.newTitle}
                    </p>
                  )}
                  {c.type === "delete" && (
                    <p className="text-[13px] mt-[4px]" style={{ color: "var(--sys-label-tertiary)" }}>
                      항목 삭제
                    </p>
                  )}
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-[10px]" style={{ borderTop: "0.5px solid var(--sys-separator)" }}>
          <p className="text-[12px] text-center" style={{ color: "var(--sys-label-quaternary)" }}>
            {selectedCount}개 변경사항 선택됨
          </p>
        </div>
      </div>
    </div>
  );
}
