import type { ReactNode } from "react";

/** Re-mounts on every navigation: a short, subtle page entrance (disabled for reduced motion). */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
