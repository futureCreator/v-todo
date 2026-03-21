"use client";

import type { Todo, Quadrant } from "@/types";
import { QUADRANT_ORDER } from "@/types";
import QuadrantPanel from "./QuadrantPanel";

interface QuadrantGridProps {
  todos: Todo[];
  activeQuadrant: Quadrant;
  onSelectQuadrant: (q: Quadrant) => void;
  onAdd: (title: string, quadrant: Quadrant, dueDate: string | null) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
}

export default function QuadrantGrid({
  todos,
  activeQuadrant,
  onSelectQuadrant,
  onAdd,
  onToggle,
  onDelete,
  onEdit,
}: QuadrantGridProps) {
  return (
    <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-7 flex-1 px-12 py-6 min-h-0 max-w-[1440px] mx-auto w-full">
      {QUADRANT_ORDER.map((q) => (
        <QuadrantPanel
          key={q}
          quadrant={q}
          todos={todos.filter((t) => t.quadrant === q)}
          isActive={activeQuadrant === q}
          onSelect={() => onSelectQuadrant(q)}
          onAdd={onAdd}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
