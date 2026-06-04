import { Suspense, type ReactNode } from "react";

export default function MenuEnterLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
