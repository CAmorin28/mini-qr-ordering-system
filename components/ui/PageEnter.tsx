import type { ReactNode } from "react";

interface PageEnterProps {
  children: ReactNode;
  className?: string;
}

/** Fade/slide-in for page sections after load (respects reduced motion in CSS). */
export function PageEnter({ children, className = "" }: PageEnterProps) {
  return <div className={`page-enter ${className}`.trim()}>{children}</div>;
}
