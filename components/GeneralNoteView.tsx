"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FileItem } from "@/types";
import FileListItem from "@/components/FileListItem";
import NoteEditor from "@/components/NoteEditor";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type NavState =
  | { type: "list"; path: string }
  | { type: "editor"; path: string; fileName: string };

export default function GeneralNoteView() {
  const [navStack, setNavStack] = useState<NavState[]>([
    { type: "list", path: "/" },
  ]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [editorContent, setEditorContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNameInput, setShowNameInput] = useState<"file" | "directory" | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef("");
  const dirtyRef = useRef(false);
  const currentPathRef = useRef("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const current = navStack[navStack.length - 1];

  const fetchFiles = useCallback(async (dirPath: string) => {
    try {
      const res = await fetch(
        `${BASE}/api/notes/files?path=${encodeURIComponent(dirPath)}`
      );
      const body = await res.json();
      if (Array.isArray(body.data)) setFiles(body.data);
    } catch {
      setFiles([]);
    }
  }, []);

  const fetchFileContent = useCallback(async (filePath: string) => {
    currentPathRef.current = filePath;
    try {
      const res = await fetch(
        `${BASE}/api/notes/files?path=${encodeURIComponent(filePath)}`
      );
      const body = await res.json();
      const text = typeof body.data === "string" ? body.data : "";
      setEditorContent(text);
      contentRef.current = text;
      dirtyRef.current = false;
      setSaveStatus(text ? "saved" : "idle");
    } catch {
      setEditorContent("");
      contentRef.current = "";
    }
  }, []);

  const saveFile = useCallback(async () => {
    if (!dirtyRef.current || !currentPathRef.current) return;
    setSaveStatus("saving");
    try {
      await fetch(
        `${BASE}/api/notes/files?path=${encodeURIComponent(currentPathRef.current)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: contentRef.current }),
        }
      );
      dirtyRef.current = false;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("saved");
    }
  }, []);

  // Fetch when current nav state changes
  useEffect(() => {
    if (current.type === "list") {
      fetchFiles(current.path);
    } else {
      fetchFileContent(current.path);
    }
  }, [current, fetchFiles, fetchFileContent]);

  // Save on visibility change
  useEffect(() => {
    const handler = () => {
      if (document.hidden) saveFile();
    };
    document.addEventListener("visibilitychange", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      saveFile();
    };
  }, [saveFile]);

  const handleEditorChange = useCallback(
    (newContent: string) => {
      contentRef.current = newContent;
      dirtyRef.current = true;
      setSaveStatus("saving");

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveFile();
      }, 1000);
    },
    [saveFile]
  );

  const goBack = useCallback(() => {
    if (navStack.length <= 1) return;
    saveFile();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setNavStack((prev) => prev.slice(0, -1));
  }, [navStack.length, saveFile]);

  const openItem = useCallback(
    (item: FileItem) => {
      const currentPath =
        current.type === "list" ? current.path : "/";
      const newPath =
        currentPath === "/"
          ? `/${item.name}`
          : `${currentPath}/${item.name}`;

      if (item.type === "directory") {
        setNavStack((prev) => [...prev, { type: "list", path: newPath }]);
      } else {
        setNavStack((prev) => [
          ...prev,
          { type: "editor", path: newPath, fileName: item.name },
        ]);
      }
    },
    [current]
  );

  const createNew = async (type: "file" | "directory") => {
    const name = nameValue.trim();
    if (!name) return;
    const dirPath = current.type === "list" ? current.path : "/";
    try {
      await fetch(`${BASE}/api/notes/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, path: dirPath }),
      });
      setShowNameInput(null);
      setNameValue("");
      fetchFiles(dirPath);

      // If file, open it
      if (type === "file") {
        const fileName = name.endsWith(".md") ? name : `${name}.md`;
        const filePath =
          dirPath === "/" ? `/${fileName}` : `${dirPath}/${fileName}`;
        setNavStack((prev) => [
          ...prev,
          { type: "editor", path: filePath, fileName },
        ]);
      }
    } catch {
      // ignore
    }
  };

  const handleRename = async (item: FileItem, newName: string) => {
    const dirPath = current.type === "list" ? current.path : "/";
    const itemPath =
      dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`;
    try {
      await fetch(
        `${BASE}/api/notes/files?path=${encodeURIComponent(itemPath)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newName }),
        }
      );
      fetchFiles(dirPath);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (item: FileItem) => {
    const dirPath = current.type === "list" ? current.path : "/";
    const itemPath =
      dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`;
    try {
      await fetch(
        `${BASE}/api/notes/files?path=${encodeURIComponent(itemPath)}`,
        { method: "DELETE" }
      );
      setShowDeleteConfirm(null);
      fetchFiles(dirPath);
    } catch {
      // ignore
    }
  };

  const currentFolderName = () => {
    if (current.type === "list" && current.path !== "/") {
      return current.path.split("/").pop() ?? "";
    }
    if (current.type === "editor") {
      return current.fileName.replace(/\.md$/, "");
    }
    return "노트";
  };

  const showBackButton = navStack.length > 1;

  // Editor view
  if (current.type === "editor") {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Nav bar */}
        <div className="flex items-center gap-2 px-5 md:px-0 py-3">
          <button
            className="flex items-center gap-1 text-[var(--accent-primary)] active:opacity-60 transition-opacity"
            onClick={goBack}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="13 4 7 10 13 16" />
            </svg>
            <span className="text-[20px]">뒤로</span>
          </button>
          <span className="flex-1 text-[20px] font-semibold text-[var(--label-primary)] text-center truncate pr-12">
            {currentFolderName()}
          </span>
          {saveStatus !== "idle" && (
            <span className="text-[13px] text-[var(--label-tertiary)] absolute right-5 md:right-0">
              {saveStatus === "saving" ? "저장 중..." : "저장됨"}
            </span>
          )}
        </div>
        <NoteEditor
          content={editorContent}
          onChange={handleEditorChange}
          placeholder="노트를 작성하세요..."
        />
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Nav bar */}
      {showBackButton && (
        <div className="flex items-center gap-2 px-5 md:px-0 py-3">
          <button
            className="flex items-center gap-1 text-[var(--accent-primary)] active:opacity-60 transition-opacity"
            onClick={goBack}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="13 4 7 10 13 16" />
            </svg>
            <span className="text-[20px]">뒤로</span>
          </button>
          <span className="flex-1 text-[20px] font-semibold text-[var(--label-primary)] text-center truncate pr-12">
            {currentFolderName()}
          </span>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 && !showNameInput ? (
          <div className="flex flex-col items-center justify-center py-24 text-[var(--label-tertiary)]">
            <span className="text-[56px] mb-5 opacity-30">📝</span>
            <p className="text-[20px]">노트가 없습니다</p>
            <p className="text-[15px] text-[var(--label-quaternary)] mt-1.5">
              + 버튼으로 새 노트를 만들어보세요
            </p>
          </div>
        ) : (
          <>
            {files.map((item) => (
              <div key={item.name} className="border-b border-[var(--separator)]/50">
                <FileListItem
                  item={item}
                  onOpen={() => openItem(item)}
                  onRename={(newName) => handleRename(item, newName)}
                  onDelete={() => setShowDeleteConfirm(item.name)}
                />
              </div>
            ))}
          </>
        )}

        {/* Name input for new file/folder */}
        {showNameInput && (
          <div className="px-5 md:px-0 py-3 flex items-center gap-3">
            <div className="size-8 flex items-center justify-center text-[var(--label-tertiary)]">
              {showNameInput === "directory" ? (
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
            <input
              ref={nameInputRef}
              className="flex-1 bg-[var(--fill-quaternary)] rounded-lg px-3 py-2 text-[20px] text-[var(--label-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
              placeholder={
                showNameInput === "directory" ? "폴더 이름" : "노트 이름"
              }
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createNew(showNameInput);
                if (e.key === "Escape") {
                  setShowNameInput(null);
                  setNameValue("");
                }
              }}
              onBlur={() => {
                if (!nameValue.trim()) {
                  setShowNameInput(null);
                  setNameValue("");
                }
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* + Button */}
      <div className="relative mx-5 md:mx-0 mt-auto pt-4">
        <button
          className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white text-[20px] font-semibold active:opacity-80 transition-opacity"
          onClick={() => setShowNewMenu(!showNewMenu)}
        >
          새로 만들기
        </button>

        {showNewMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNewMenu(false)}
            />
            <div className="absolute bottom-full mb-2 left-5 right-5 md:left-0 md:right-0 z-50 bg-[var(--bg-elevated)] rounded-xl border border-[var(--separator)] shadow-lg overflow-hidden">
              <button
                className="w-full px-5 py-3.5 text-left text-[17px] text-[var(--label-primary)] active:bg-[var(--fill-quaternary)] transition-colors flex items-center gap-3"
                onClick={() => {
                  setShowNewMenu(false);
                  setShowNameInput("file");
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 2h8l4 4v11a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
                  <polyline points="12 2 12 6 16 6" />
                </svg>
                새 노트
              </button>
              <div className="h-px bg-[var(--separator)]" />
              <button
                className="w-full px-5 py-3.5 text-left text-[17px] text-[var(--label-primary)] active:bg-[var(--fill-quaternary)] transition-colors flex items-center gap-3"
                onClick={() => {
                  setShowNewMenu(false);
                  setShowNameInput("directory");
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="var(--accent-primary)" opacity="0.8">
                  <path d="M2 4a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" />
                </svg>
                새 폴더
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 ios-sheet-overlay"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--bg-elevated)] rounded-2xl w-[280px] overflow-hidden shadow-xl">
            <div className="px-5 pt-5 pb-4 text-center">
              <p className="text-[17px] font-semibold text-[var(--label-primary)]">
                삭제하시겠습니까?
              </p>
              <p className="text-[15px] text-[var(--label-secondary)] mt-1">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="border-t border-[var(--separator)] flex">
              <button
                className="flex-1 py-3.5 text-[17px] text-[var(--accent-primary)] font-medium border-r border-[var(--separator)] active:bg-[var(--fill-quaternary)]"
                onClick={() => setShowDeleteConfirm(null)}
              >
                취소
              </button>
              <button
                className="flex-1 py-3.5 text-[17px] text-[var(--system-red)] font-semibold active:bg-[var(--fill-quaternary)]"
                onClick={() => {
                  const item = files.find(
                    (f) => f.name === showDeleteConfirm
                  );
                  if (item) handleDelete(item);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
