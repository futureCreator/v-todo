"use client";

import ReactMarkdown from "react-markdown";

interface BriefingModalProps {
  briefing: string;
  onClose: () => void;
}

export default function BriefingModal({ briefing, onClose }: BriefingModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay"
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="ios-sheet w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-[16px] md:rounded-[16px]"
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
          <div className="w-[50px]" />
          <h3 className="text-[20px] font-semibold" style={{ color: "var(--sys-label)" }}>
            오늘의 브리핑
          </h3>
          <button
            onClick={onClose}
            className="text-[20px] font-semibold w-[50px] text-right active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            완료
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5 prose dark:prose-invert max-w-none"
          style={{ color: "var(--sys-label)" }}
        >
          <ReactMarkdown>{briefing}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
