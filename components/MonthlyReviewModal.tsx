"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { haptic } from "@/lib/haptic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface MonthlyReviewModalProps {
  onClose: () => void;
}

interface ReviewData {
  date: string;
  content: string;
  generatedAt: string;
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi} 생성`;
  } catch {
    return "";
  }
}

export default function MonthlyReviewModal({ onClose }: MonthlyReviewModalProps) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const qs = refresh ? "?refresh=1" : "";
      const res = await fetch(`${BASE}/api/ai/monthly-review${qs}`);
      const body: { data?: ReviewData; error?: string } = await res.json();
      if (!res.ok || !body.data) {
        setError(body.error ?? "AI 응답을 가져올 수 없어요. 잠시 후 다시 시도해주세요.");
      } else {
        setData(body.data);
      }
    } catch {
      setError("AI 응답을 가져올 수 없어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const handleRefresh = () => {
    haptic.selection();
    load(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center ios-sheet-overlay"
      style={{ background: "rgba(0,0,0,0.4)" }}
      role="dialog"
      aria-modal="true"
      aria-label="이 달 회고"
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

        <div
          className="flex items-center justify-between px-5 py-[14px]"
          style={{ borderBottom: "0.5px solid var(--sys-separator)" }}
        >
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="w-[50px] text-left text-[20px] active:opacity-60 transition-opacity disabled:opacity-40"
            style={{ color: "var(--sys-blue)" }}
            aria-label="다시 생성"
          >
            ↻
          </button>
          <h3 className="text-[20px] font-semibold" style={{ color: "var(--sys-label)" }}>
            이 달 회고
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[20px] font-semibold w-[50px] text-right active:opacity-60 transition-opacity"
            style={{ color: "var(--sys-blue)" }}
          >
            완료
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-5 prose dark:prose-invert max-w-none"
          style={{ color: "var(--sys-label)" }}
        >
          {loading && <p>회고를 정리하고 있어요...</p>}
          {!loading && error && <p>{error}</p>}
          {!loading && !error && data && <ReactMarkdown>{data.content}</ReactMarkdown>}
        </div>

        {!loading && !error && data && (
          <div
            className="px-5 py-3 text-[13px]"
            style={{
              borderTop: "0.5px solid var(--sys-separator)",
              color: "var(--label-tertiary)",
            }}
          >
            {formatGeneratedAt(data.generatedAt)}
          </div>
        )}
      </div>
    </div>
  );
}
