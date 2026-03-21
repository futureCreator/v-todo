"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Todo, Quadrant, ApiResponse, UpdateTodoRequest,
  AiSuggestResponse, AiCleanupResponse, AiCleanupChange, AiBriefingResponse,
} from "@/types";
import TabBar from "@/components/TabBar";
import QuadrantGrid from "@/components/QuadrantGrid";
import QuadrantPanel from "@/components/QuadrantPanel";
import TodoInput from "@/components/TodoInput";
import Toast from "@/components/Toast";
import AiActions from "@/components/AiActions";
import AiSuggestPreview from "@/components/AiSuggestPreview";
import AiCleanupDiff from "@/components/AiCleanupDiff";
import BriefingModal from "@/components/BriefingModal";
import TodoEditSheet from "@/components/TodoEditSheet";

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activeQuadrant, setActiveQuadrant] = useState<Quadrant>("urgent-important");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestResponse["suggestions"] | null>(null);
  const [cleanupChanges, setCleanupChanges] = useState<AiCleanupChange[] | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      const body: ApiResponse<Todo[]> = await res.json();
      if (body.data) setTodos(body.data);
    } catch {
      setError("할 일을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const handleAdd = async (title: string, quadrant: Quadrant, dueDate: string | null) => {
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, quadrant, dueDate }),
      });
      const body: ApiResponse<Todo> = await res.json();
      if (!res.ok) { setError(body.error || "추가에 실패했습니다."); return; }
      await fetchTodos();
    } catch { setError("추가에 실패했습니다."); }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) {
        const body: ApiResponse<null> = await res.json();
        setError(body.error || "수정에 실패했습니다.");
        return;
      }
      await fetchTodos();
    } catch { setError("수정에 실패했습니다."); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body: ApiResponse<null> = await res.json();
        setError(body.error || "삭제에 실패했습니다.");
        return;
      }
      await fetchTodos();
    } catch { setError("삭제에 실패했습니다."); }
  };

  const handleSuggest = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quadrant: activeQuadrant }),
      });
      const body: ApiResponse<AiSuggestResponse> = await res.json();
      if (!res.ok || !body.data) { setError(body.error || "AI 서비스를 사용할 수 없습니다."); return; }
      setSuggestions(body.data.suggestions);
    } catch { setError("AI 서비스를 사용할 수 없습니다."); }
    finally { setAiLoading(false); }
  };

  const handleAcceptSuggestions = async (selected: AiSuggestResponse["suggestions"]) => {
    for (const s of selected) {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: s.title, quadrant: activeQuadrant, dueDate: s.dueDate, aiGenerated: true }),
      });
    }
    setSuggestions(null);
    await fetchTodos();
  };

  const handleCleanup = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quadrant: activeQuadrant }),
      });
      const body: ApiResponse<AiCleanupResponse> = await res.json();
      if (!res.ok || !body.data) { setError(body.error || "AI 서비스를 사용할 수 없습니다."); return; }
      if (body.data.changes.length === 0) { setError("정리할 항목이 없습니다."); return; }
      setCleanupChanges(body.data.changes);
    } catch { setError("AI 서비스를 사용할 수 없습니다."); }
    finally { setAiLoading(false); }
  };

  const handleApplyCleanup = async (accepted: AiCleanupChange[]) => {
    try {
      await fetch("/api/ai/cleanup/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quadrant: activeQuadrant, changes: accepted }),
      });
      setCleanupChanges(null);
      await fetchTodos();
    } catch { setError("정리 적용에 실패했습니다."); }
  };

  const handleBriefing = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/briefing");
      const body: ApiResponse<AiBriefingResponse> = await res.json();
      if (!res.ok || !body.data) { setError(body.error || "AI 서비스를 사용할 수 없습니다."); return; }
      setBriefing(body.data.briefing);
    } catch { setError("AI 서비스를 사용할 수 없습니다."); }
    finally { setAiLoading(false); }
  };

  const handleEdit = async (id: string, updates: UpdateTodoRequest) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const body: ApiResponse<null> = await res.json();
        setError(body.error || "수정에 실패했습니다.");
        return;
      }
      setEditingTodo(null);
      await fetchTodos();
    } catch { setError("수정에 실패했습니다."); }
  };

  const handleEditDelete = async (id: string) => {
    setEditingTodo(null);
    await handleDelete(id);
  };

  /* ── Loading State ── */
  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ background: "var(--sys-bg)" }}>
        <div className="flex flex-col items-center gap-4 item-enter">
          <div
            className="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center"
            style={{ background: "var(--sys-fill-quaternary)" }}
          >
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <path
                d="M6 14L12 20L22 8"
                stroke="var(--sys-blue)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            className="w-6 h-6 rounded-full border-[2px] border-t-transparent"
            style={{
              borderColor: "var(--sys-separator-opaque)",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      </main>
    );
  }

  /* ── Empty State ── */
  if (todos.length === 0) {
    return (
      <main
        className="min-h-dvh flex flex-col items-center justify-center px-6"
        style={{ background: "var(--sys-bg)" }}
      >
        <div className="flex flex-col items-center w-full max-w-sm item-enter">
          {/* Matrix illustration */}
          <div className="mb-8">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
              <rect x="4" y="4" width="42" height="42" rx="10" fill="var(--q-urgent-important-tint)" stroke="var(--q-urgent-important)" strokeWidth="1" opacity="0.8" />
              <rect x="54" y="4" width="42" height="42" rx="10" fill="var(--q-not-urgent-important-tint)" stroke="var(--q-not-urgent-important)" strokeWidth="1" opacity="0.6" />
              <rect x="4" y="54" width="42" height="42" rx="10" fill="var(--q-urgent-not-important-tint)" stroke="var(--q-urgent-not-important)" strokeWidth="1" opacity="0.6" />
              <rect x="54" y="54" width="42" height="42" rx="10" fill="var(--q-not-urgent-not-important-tint)" stroke="var(--q-not-urgent-not-important)" strokeWidth="1" opacity="0.4" />
              <path d="M18 25l4 4 8-8" stroke="var(--q-urgent-important)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M68 25l4 4 8-8" stroke="var(--q-not-urgent-important)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold mb-2" style={{ color: "var(--sys-label)" }}>
            v-todo
          </h1>
          <p
            className="text-[16px] text-center mb-10 leading-relaxed"
            style={{ color: "var(--sys-label-tertiary)" }}
          >
            아이젠하워 매트릭스로<br />할 일의 우선순위를 관리하세요
          </p>
          <div className="w-full ios-card">
            <TodoInput quadrant="urgent-important" onAdd={handleAdd} />
          </div>
        </div>
        {error && <Toast message={error} onClose={() => setError(null)} />}
      </main>
    );
  }

  /* ── Main ── */
  const activeTodos = todos.filter((t) => t.quadrant === activeQuadrant);

  return (
    <main className="min-h-dvh flex flex-col" style={{ background: "var(--sys-bg)" }}>
      {/* Navigation Bar */}
      <header className="ios-navbar sticky top-0 z-30 safe-area-pt">
        <div className="flex items-center justify-between px-7 md:px-12 h-[44px]">
          <span className="text-[17px] font-semibold md:block hidden" style={{ color: "var(--sys-label)" }}>
            v-todo
          </span>
          <span className="text-[17px] font-semibold md:hidden" style={{ color: "var(--sys-label)" }}>
            &nbsp;
          </span>
          <button
            onClick={handleBriefing}
            disabled={aiLoading}
            className="text-[15px] font-medium disabled:opacity-40 transition-opacity active:opacity-60"
            style={{ color: "var(--sys-blue)" }}
          >
            브리핑
          </button>
        </div>
      </header>

      {/* Large Title — mobile only */}
      <div className="md:hidden px-7 pt-1 pb-2">
        <h1 className="text-[34px] font-bold tracking-tight" style={{ color: "var(--sys-label)" }}>
          v-todo
        </h1>
      </div>

      {/* Desktop: 2x2 Grid */}
      <QuadrantGrid
        todos={todos}
        activeQuadrant={activeQuadrant}
        onSelectQuadrant={setActiveQuadrant}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onEdit={(todo) => setEditingTodo(todo)}
      />

      {/* Mobile: Single quadrant */}
      <div className="flex-1 md:hidden overflow-hidden px-5 pb-[88px]">
        <QuadrantPanel
          quadrant={activeQuadrant}
          todos={activeTodos}
          isActive={true}
          onSelect={() => {}}
          onAdd={handleAdd}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={(todo) => setEditingTodo(todo)}
        />
      </div>

      <TabBar active={activeQuadrant} onChange={setActiveQuadrant} />

      <AiActions onSuggest={handleSuggest} onCleanup={handleCleanup} loading={aiLoading} />

      {suggestions && (
        <AiSuggestPreview suggestions={suggestions} onAccept={handleAcceptSuggestions} onClose={() => setSuggestions(null)} />
      )}
      {cleanupChanges && (
        <AiCleanupDiff changes={cleanupChanges} onApply={handleApplyCleanup} onClose={() => setCleanupChanges(null)} />
      )}
      {briefing && (
        <BriefingModal briefing={briefing} onClose={() => setBriefing(null)} />
      )}

      {editingTodo && (
        <TodoEditSheet
          todo={editingTodo}
          onSave={handleEdit}
          onDelete={handleEditDelete}
          onClose={() => setEditingTodo(null)}
        />
      )}

      {error && <Toast message={error} onClose={() => setError(null)} />}
    </main>
  );
}
