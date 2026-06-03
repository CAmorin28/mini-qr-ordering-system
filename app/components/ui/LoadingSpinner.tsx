type SpinnerSize = "sm" | "md" | "lg";

const SIZE_PX: Record<SpinnerSize, number> = {
  sm: 20,
  md: 40,
  lg: 48,
};

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Visually hidden label for screen readers */
  label?: string;
}

/** Standard circular indeterminate loader — full ring track with rotating arc. */
export function LoadingSpinner({
  size = "md",
  className = "",
  label = "Loading",
}: LoadingSpinnerProps) {
  const dim = SIZE_PX[size];
  const stroke = size === "sm" ? 2.5 : 3;
  const radius = (dim - stroke) / 2 - 0.5;
  const cx = dim / 2;
  const cy = dim / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.72;

  return (
    <svg
      role="status"
      aria-label={label}
      width={dim}
      height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      className={`loading-spinner-svg shrink-0 ${className}`}
    >
      <circle
        className="loading-spinner-track"
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        strokeWidth={stroke}
      />
      <circle
        className="loading-spinner-arc"
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arcLength} ${circumference}`}
      />
    </svg>
  );
}
