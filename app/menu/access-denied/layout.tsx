import { Suspense, type ReactNode } from "react";

export default function AccessDeniedLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
