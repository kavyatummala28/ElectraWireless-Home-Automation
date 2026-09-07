import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Wifi, Bluetooth, Cloud, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";
import { cn } from "@/lib/utils";
import type { FallbackStatus } from "@/lib/home/types";
import { SciFiCard } from "@/components/ui/sci-fi-card";

export const Route = createFileRoute("/settings-network")({
  component: SettingsNetworkPage,
});

const statusStyles: Record<FallbackStatus, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/40",
  standby: "bg-white dark:bg-secondary/20 text-muted-foreground border-border/20",
  down: "bg-red-500/15 text-red-400 border-red-500/40",
};

const fallbackIcon: Record<string, typeof Wifi> = { lan: Wifi, ble: Bluetooth, cloud: Cloud };

function SettingsNetworkPage() {
  const { state, dispatch } = useHome();

  return (
    <div className="bg-slate-50 dark:bg-black flex-1 text-foreground pb-6 -mx-4 px-4 sm:-mx-8 sm:px-8 flex flex-col">
      <div className="mx-auto max-w-4xl w-full space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 bg-white/40 dark:bg-card rounded-full hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-blue-200 dark:border-border/20">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight">Network & Fallback</h1>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button className="flex-1 py-3 font-bold rounded-[1rem] bg-white/40 dark:bg-secondary/10 border border-blue-200 dark:border-border/40 hover:bg-white/60 dark:hover:bg-secondary/10 transition-all text-xs text-foreground" onClick={() => { dispatch({ type: "FAILOVER", key: "ble" }); toast("Simulating Wi-Fi outage → BLE"); }}>
            Simulate Outage
          </button>
          <button className="flex-1 py-3 font-bold flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 rounded-[1rem] shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white transition-all text-xs" onClick={() => { dispatch({ type: "RESTORE_NETWORK" }); toast.success("Network restored"); }}>
            <RotateCcw className="h-3.5 w-3.5" /> Restore Primary
          </button>
        </div>

        <div className="grid gap-3 mt-4">
          {state.fallback.map((f) => {
            const Icon = fallbackIcon[f.key] || Wifi;
            return (
              <SciFiCard key={f.key} color={f.status === "active" ? "emerald" : "blue"} glow={f.status === "active"} className="p-4">
                <div className="flex items-start gap-4">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border text-muted-foreground", f.status === "active" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/40 dark:bg-secondary border-blue-200 dark:border-border/20")}>
                    <Icon className={cn("h-5 w-5", f.status === "active" ? "text-emerald-500" : "text-blue-500 dark:text-blue-400")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <p className="font-bold text-foreground text-sm">{f.path}</p>
                      <span className="px-2 py-0.5 bg-secondary/30 rounded-full text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-muted-foreground leading-relaxed font-medium">{f.scenario}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/20 pt-3.5">
                  <span className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border", statusStyles[f.status])}>
                    {f.status}
                  </span>
                  {f.status !== "active" && (
                    <button className="text-xs font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" onClick={() => { dispatch({ type: "FAILOVER", key: f.key }); toast(`Routing via ${f.path}`); }}>
                      Route via this tier →
                    </button>
                  )}
                </div>
              </SciFiCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
