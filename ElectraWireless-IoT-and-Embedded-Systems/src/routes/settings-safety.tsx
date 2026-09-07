import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Thermometer, Activity, Server } from "lucide-react";
import { SciFiCard } from "@/components/ui/sci-fi-card";

export const Route = createFileRoute("/settings-safety")({
  component: SettingsSafetyPage,
});

function SettingsSafetyPage() {
  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 bg-white/40 dark:bg-card rounded-full hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-emerald-200 dark:border-border/20">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight">Safety & Risk</h1>
        </div>

        <div className="grid gap-3 mt-5">
          <SciFiCard color="emerald" className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/40 dark:bg-secondary border border-emerald-200 dark:border-border/20 text-emerald-600 dark:text-foreground/80">
                <Thermometer className="h-5 w-5 text-emerald-600 dark:text-muted-foreground" />
              </div>
              <span className="font-bold text-sm text-foreground">Overheating</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="font-bold text-emerald-600 dark:text-emerald-500 text-xs uppercase tracking-wide">Normal</span>
            </div>
          </SciFiCard>
          
          <SciFiCard color="emerald" className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/40 dark:bg-secondary border border-emerald-200 dark:border-border/20 text-emerald-600 dark:text-foreground/80">
                <Activity className="h-5 w-5 text-emerald-600 dark:text-muted-foreground" />
              </div>
              <span className="font-bold text-sm text-foreground">Abnormal usage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="font-bold text-emerald-600 dark:text-emerald-500 text-xs uppercase tracking-wide">None</span>
            </div>
          </SciFiCard>
          
          <SciFiCard color="emerald" className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/40 dark:bg-secondary border border-emerald-200 dark:border-border/20 text-emerald-600 dark:text-foreground/80">
                <Server className="h-5 w-5 text-emerald-600 dark:text-muted-foreground" />
              </div>
              <span className="font-bold text-sm text-foreground">Overload guard</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="font-bold text-emerald-600 dark:text-emerald-500 text-xs uppercase tracking-wide">Armed</span>
            </div>
          </SciFiCard>
        </div>
      </div>
    </div>
  );
}
