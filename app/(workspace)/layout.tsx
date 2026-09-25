import type { ReactNode } from "react";
import Studio from "../studio/studio";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Studio />
      {children}
    </>
  );
}
