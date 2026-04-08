"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface MasonryGridProps {
  children: ReactNode[];
  gap?: number;
}

export default function MasonryGrid({ children, gap = 12 }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<[number[], number[]]>([[], []]);

  useEffect(() => {
    // Simple distribution: alternate items between columns
    const left: number[] = [];
    const right: number[] = [];
    for (let i = 0; i < children.length; i++) {
      if (i % 2 === 0) left.push(i);
      else right.push(i);
    }
    setColumns([left, right]);
  }, [children.length]);

  const items = Array.isArray(children) ? children : [children];

  return (
    <div
      ref={containerRef}
      className="flex"
      style={{ gap }}
    >
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 flex flex-col" style={{ gap }}>
          {col.map((idx) => (
            <div key={idx}>{items[idx]}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
