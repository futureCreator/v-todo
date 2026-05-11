import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 gap-4">
      <div className="text-[var(--label-tertiary)] opacity-70" aria-hidden="true">
        {icon}
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-[20px] font-medium text-[var(--label-secondary)]">{title}</h2>
        {description && (
          <p className="text-[15px] text-[var(--label-tertiary)] max-w-[280px]">{description}</p>
        )}
      </div>
      {action && (
        <button
          type="button"
          className="press mt-2 px-5 py-2.5 rounded-full bg-[var(--fill-tertiary)] text-[var(--label-primary)] text-[15px] font-medium"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
