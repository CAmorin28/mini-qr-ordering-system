interface TableBiteBrandProps {
  /** Use on dark (primary) backgrounds */
  variant?: "on-dark" | "on-light";
  size?: "md" | "lg" | "xl";
  className?: string;
}

export function TableBiteBrand({
  variant = "on-light",
  size = "md",
  className = "",
}: TableBiteBrandProps) {
  const isDark = variant === "on-dark";
  const iconSize =
    size === "xl"
      ? "text-[64px] md:text-[72px]"
      : size === "lg"
        ? "text-[56px] sm:text-[64px]"
        : "text-[40px] sm:text-[48px]";
  const titleSize =
    size === "xl"
      ? "text-4xl md:text-5xl"
      : size === "lg"
        ? "text-3xl sm:text-4xl"
        : "text-2xl sm:text-3xl";

  return (
    <div className={`flex items-center gap-3 sm:gap-4 md:gap-5 ${className}`.trim()}>
      <span
        className={`material-symbols-outlined shrink-0 ${iconSize} text-secondary-container`}
      >
        restaurant
      </span>
      <span
        className={`font-bold tracking-tight ${titleSize} ${
          isDark ? "text-on-primary" : "text-on-surface"
        }`}
      >
        TableBite
      </span>
    </div>
  );
}
