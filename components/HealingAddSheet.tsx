"use client";

import { useState, useRef } from "react";

type HealingType = "image" | "text" | "link";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface HealingAddSheetProps {
  onSave: (data: {
    title: string;
    category: "healing";
    healingType: HealingType;
    url: string | null;
    imageUrl: string | null;
    price: null;
    memo: null;
  }) => void;
  onClose: () => void;
}

export default function HealingAddSheet({ onSave, onClose }: HealingAddSheetProps) {
  const [type, setType] = useState<HealingType>("image");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave =
    (type === "image" && uploadedUrl !== null) ||
    (type === "text" && text.trim().length > 0) ||
    (type === "link" && url.trim().length > 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewSrc(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}/api/wishes/upload`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (body.data?.imageUrl) {
        setUploadedUrl(body.data.imageUrl);
      }
    } catch {
      // silent
    }
    setUploading(false);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: type === "text" ? text.trim() : "",
      category: "healing",
      healingType: type,
      url: type === "link" ? url.trim() : null,
      imageUrl: type === "image" ? uploadedUrl : null,
      price: null,
      memo: null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl p-6 animate-[sheetUp_0.3s_ease-out] max-h-[85dvh] overflow-y-auto"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-[var(--fill-tertiary)] rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button className="text-[var(--label-tertiary)] text-[20px]" onClick={onClose}>
            취소
          </button>
          <h2 className="text-[20px] font-semibold text-[var(--label-primary)]">힐링 추가</h2>
          <button
            className={`text-[20px] font-semibold ${canSave ? "text-[var(--accent-primary)]" : "text-[var(--label-quaternary)]"}`}
            onClick={handleSave}
            disabled={!canSave}
          >
            저장
          </button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 mb-5">
          {([
            { key: "image" as const, label: "🖼️ 이미지" },
            { key: "text" as const, label: "✍️ 글" },
            { key: "link" as const, label: "🔗 링크" },
          ]).map((t) => (
            <button
              key={t.key}
              className={`flex-1 py-3 rounded-xl text-[17px] font-medium transition-colors ${
                type === t.key
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
              }`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content based on type */}
        {type === "image" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewSrc ? (
              <div className="rounded-xl overflow-hidden mb-4">
                <img src={previewSrc} alt="미리보기" className="w-full" />
              </div>
            ) : null}
            <button
              className="w-full py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-secondary)] font-medium"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "업로드 중..." : uploadedUrl ? "다른 사진 선택" : "사진 선택"}
            </button>
          </div>
        )}

        {type === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="위로가 되는 글을 적어보세요"
            rows={5}
            maxLength={1000}
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none resize-none"
          />
        )}

        {type === "link" && (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--fill-quaternary)] text-[20px] text-[var(--label-primary)] placeholder:text-[var(--label-quaternary)] outline-none"
          />
        )}
      </div>
    </div>
  );
}
