import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  children,
  compact,
}: {
  icon: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty empty-with-icon ${compact ? "empty-compact" : ""}`}>
      <span className="empty-ico" aria-hidden="true">
        {icon}
      </span>
      <p>{children}</p>
    </div>
  );
}
