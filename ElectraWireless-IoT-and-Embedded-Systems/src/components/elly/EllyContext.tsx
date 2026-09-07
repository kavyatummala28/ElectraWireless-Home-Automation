import { createContext, useContext, useState, type ReactNode } from "react";
import { EllyPortal } from "./EllyPortal";

type EllyCtx = { open: boolean; openElly: (cmd?: string) => void; closeElly: () => void };

const Ctx = createContext<EllyCtx | null>(null);

export function EllyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialCmd, setInitialCmd] = useState<string | undefined>();
  return (
    <Ctx.Provider value={{ open, openElly: (cmd) => { setInitialCmd(cmd); setOpen(true); }, closeElly: () => setOpen(false) }}>
      {children}
      {open && <EllyPortal open={open} onClose={() => setOpen(false)} initialCmd={initialCmd} />}
    </Ctx.Provider>
  );
}

export function useElly() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useElly must be used within EllyProvider");
  return ctx;
}
