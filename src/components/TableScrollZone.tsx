import type { ReactNode } from "react";

interface TableScrollZoneProps {
  children: ReactNode;
  className?: string;
  hint?: string;
}

export function TableScrollZone({
  children,
  className = "",
  hint = "Swipe sideways for more →",
}: TableScrollZoneProps) {
  return (
    <div className={`table-scroll-zone ${className}`.trim()}>
      <p className="table-scroll-zone__hint" aria-hidden="true">
        {hint}
      </p>
      {children}
    </div>
  );
}