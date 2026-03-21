"use client";

import { useState } from "react";
import type { AiSuggestResponse } from "@/types";

interface AiSuggestPreviewProps {
  suggestions: AiSuggestResponse["suggestions"];
  onAccept: (selected: AiSuggestResponse["suggestions"]) => void;
  onClose: () => void;
}

export default function AiSuggestPreview({
  suggestions,
  onAccept,
  onClose,
}: AiSuggestPreviewProps) {
  const [checked, setChecked] = useState<boolean[]>(suggestions.map(() => true));

  const toggle = (i: number) => {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const selectedCount = checked.filter(Boolean).length;

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
                d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z"
                fill="var(--ai-from)"
              />
            </svg>
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--sys-label)" }}>
              AI 제안
            </h3>
          </div>
          <button
            onClick={() => onAccept(suggestions.filter((_, i) => checked[i]))}
            disabled={selectedCount === 0}
            className="text-[16px] font-semibold disabled:opacity-30 active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            추가
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {suggestions.map((s, i) => (
            <div key={i} className={`item-enter stagger-${Math.min(i + 1, 10)}`}>
              {i > 0 && (
                <div
                  className="ml-[52px] mr-5"
                  style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
                />
              )}
              <label className="flex items-center gap-[12px] px-5 py-[12px] min-h-[44px] cursor-pointer active:bg-[var(--sys-fill-quaternary)] transition-colors">
                <div
                  className="w-[22px] h-[22px] rounded-[7px] flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: checked[i] ? "var(--sys-blue)" : "transparent",
                    border: checked[i] ? "none" : "2px solid var(--sys-separator-opaque)",
                  }}
                >
                  {checked[i] && (
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
                  checked={checked[i]}
                  onChange={() => toggle(i)}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] leading-[20px]" style={{ color: "var(--sys-label)" }}>
                    {s.title}
                  </p>
                  {s.dueDate && (
                    <div className="flex items-center gap-[4px] mt-[2px]">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2.5" width="12" height="11.5" rx="2" stroke="var(--sys-label-quaternary)" strokeWidth="1.2" />
                        <path d="M2 6h12" stroke="var(--sys-label-quaternary)" strokeWidth="1.2" />
                      </svg>
                      <span className="text-[12px] tabular-nums" style={{ color: "var(--sys-label-tertiary)" }}>
                        {s.dueDate}
                      </span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-[10px]" style={{ borderTop: "0.5px solid var(--sys-separator)" }}>
          <p className="text-[12px] text-center" style={{ color: "var(--sys-label-quaternary)" }}>
            {selectedCount}개 선택됨
          </p>
        </div>
      </div>
    </div>
  );
}
