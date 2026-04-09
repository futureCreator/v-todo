"use client";

import { useState, useRef, useEffect } from "react";

interface AddLinkSheetProps {
  onSave: (data: { url: string; memo: string }) => void;
  onClose: () => void;
}

export default function AddLinkSheet({ onSave, onClose }: AddLinkSheetProps) {
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSave = url.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ url: url.trim(), memo: memo.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out] max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button className="text-[var(--label-tertiary)] text-[20px]" onClick={onClose}>
            취소
          </button>
          <h2 className="text-[20px] font-bold text-[var(--label-primary)]">링크 추가</h2>
          <button
            className={`text-[20px] font-bold ${canSave ? "text-[var(--accent-primary)]" : "text-[var(--label-quaternary)]"}`}
            onClick={handleSave}
            disabled={!canSave}
          >
            저장
          </button>
        </div>

        {/* URL input */}
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && memo === "" && handleSave()}
          placeholder="https://"
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none mb-4"
        />

        {/* Memo textarea */}
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (해시태그 가능)"
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none resize-none"
        />
      </div>
    </div>
  );
}
