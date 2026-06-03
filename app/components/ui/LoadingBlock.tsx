import type { ReactNode } from "react";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

type SpinnerSize = "sm" | "md" | "lg";

interface LoadingBlockProps {
  message?: string;
  size?: SpinnerSize;
  className?: string;
  /** Center in the viewport (route / page loads) */
  fullPage?: boolean;
  children?: ReactNode;
}

export function LoadingBlock({
  message,
  size = "md",
  className = "",
  fullPage = false,
  children,
}: LoadingBlockProps) {
  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-md text-center ${className}`}
    >
      <LoadingSpinner size={size} label={message ?? "Loading"} />
      {message ? (
        <p className="max-w-xs text-sm font-medium text-on-surface-variant">{message}</p>
      ) : null}
      {children}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-dvh w-full max-w-full items-center justify-center bg-background px-margin-mobile">
        {content}
      </div>
    );
  }

  return content;
}
