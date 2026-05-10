"use client";

import { useState, useEffect, type ReactNode } from "react";

interface MasonryGridProps {
  children: ReactNode[];
  gap?: number;
}

export default function MasonryGrid({ children, gap = 12 }: MasonryGridProps) {
  const [colCount, setColCount] = useState(2);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setColCount(e.matches ? 3 : 2);
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const items = Array.isArray(children) ? children : [children];

  // Distribute items across columns alternately
  const columns: number[][] = Array.from({ length: colCount }, () => []);
  for (let i = 0; i < items.length; i++) {
    columns[i % colCount].push(i);
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        gap,
        alignItems: "start",
      }}
    >
      {columns.map((col, ci) => (
        <div key={`col-${ci}`} className="flex flex-col min-w-0" style={{ gap }}>
          {col.map((idx) => (
            <div key={`item-${idx}`}>{items[idx]}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
