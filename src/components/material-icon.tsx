import type { CSSProperties } from "react";

export function MaterialIcon({
  name,
  size = 20,
  filled = false,
  className = "",
  label
}: {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined${filled ? " is-filled" : ""}${className ? ` ${className}` : ""}`}
      style={{ fontSize: size } as CSSProperties}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}
