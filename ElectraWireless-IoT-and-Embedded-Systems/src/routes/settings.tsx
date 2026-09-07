import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Wifi, ShieldCheck, Server, Shield, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";
import { SciFiCard } from "@/components/ui/sci-fi-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings, ELLY Home Automation" },
      { name: "description", content: "Roles & permissions, integration gateway, fallback routing and safety." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, dispatch } = useHome();

  return (
    <div className="bg-slate-50 dark:bg-black flex-1 text-foreground pb-6 -mx-4 px-4 sm:-mx-8 sm:px-8 flex flex-col">
      <div className="mx-auto max-w-4xl w-full space-y-6 pt-2">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-foreground">Settings</h1>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/settings-users" className="block">
            <SciFiCard color="purple" className="flex flex-col items-center justify-center p-4 h-full gap-2 transition-all hover:scale-105">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={2} />
              </div>
              <span className="font-bold text-foreground text-xs">Users & Access</span>
            </SciFiCard>
          </Link>
          
          <Link to="/settings-network" className="block">
            <SciFiCard color="blue" className="flex flex-col items-center justify-center p-4 h-full gap-2 transition-all hover:scale-105">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)] relative">
                <Wifi className="h-5 w-5 text-blue-600 dark:text-blue-500 relative -left-0.5" strokeWidth={2} />
                <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-card rounded-full p-[1px]">
                  <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                </div>
              </div>
              <span className="font-bold text-foreground text-xs">Network & Fallback</span>
            </SciFiCard>
          </Link>

          <Link to="/settings-gateways" className="block">
            <SciFiCard color="orange" className="flex flex-col items-center justify-center p-4 h-full gap-2 transition-all hover:scale-105">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.15)]">
                <Server className="h-5 w-5 text-orange-600 dark:text-orange-500" strokeWidth={2} />
              </div>
              <span className="font-bold text-foreground text-xs">Gateways</span>
            </SciFiCard>
          </Link>

          <Link to="/settings-safety" className="block">
            <SciFiCard color="emerald" className="flex flex-col items-center justify-center p-4 h-full gap-2 transition-all hover:scale-105">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-500" strokeWidth={2} />
              </div>
              <span className="font-bold text-foreground text-xs">Safety</span>
            </SciFiCard>
          </Link>
        </div>

        {/* Active Users */}
        <div className="space-y-3">
          <h2 className="text-purple-600 dark:text-purple-400 font-mono text-[10px] tracking-[0.25em] uppercase px-2">Active Users</h2>
          <SciFiCard color="fuchsia" className="overflow-hidden">
            {state.members.slice(0, 2).map((m, i) => {
              const isSarah = m.name.includes("Sarah");
              const roleDisplay = isSarah ? "Owner" : m.role === "family" ? "Family" : "Guest";
              const roleColor = roleDisplay === "Owner" 
                ? "bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.2)]" 
                : "bg-secondary/30 text-foreground/80";
              
              const initials = m.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

              return (
                <Dialog key={m.id}>
                  <DialogTrigger asChild>
                    <div className={`flex w-full items-center justify-between p-3.5 ${i !== 1 ? "border-b border-fuchsia-200 dark:border-fuchsia-500/20" : ""} hover:bg-white/50 dark:hover:bg-fuchsia-900/10 transition-colors cursor-pointer`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-secondary border border-fuchsia-200 dark:border-border/40 font-bold text-foreground text-[11px] tracking-wider shadow-sm">
                          {initials}
                        </div>
                        <span className="font-bold text-foreground text-sm">{m.name}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${roleColor}`}>
                        {roleDisplay}
                      </span>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white dark:bg-card border border-border/40 text-foreground rounded-[2rem] sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Edit Member Access</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary border border-border/40 font-bold text-foreground text-2xl tracking-widest shadow-inner">
                          {initials}
                        </div>
                        <h2 className="text-2xl font-bold">{m.name}</h2>
                        <span className={`px-5 py-1.5 rounded-full text-sm font-bold ${roleColor}`}>{roleDisplay}</span>
                      </div>
                      <div className="space-y-3 bg-white dark:bg-secondary/10 p-5 rounded-[1.5rem] border border-border/20">
                        <div className="flex justify-between items-center"><span className="text-muted-foreground font-medium">Scope</span><span className="font-bold capitalize">{m.scope} devices</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground font-medium">Notes</span><span className="font-bold">{m.note || "None"}</span></div>
                      </div>
                      <button className="w-full py-3 rounded-full border border-red-500/20 text-red-500 font-bold hover:bg-red-500/10 transition-all">Remove Member</button>
                    </div>
                  </DialogContent>

                </Dialog>
              );
            })}
          </SciFiCard>
        </div>

        {/* Emergency Power Cut */}
        <div className="pt-2">
          <button
            disabled={state.role === "guest"}
            onClick={() => {
              dispatch({ type: "EMERGENCY" });
              toast.error("Emergency power cut executed");
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[1.5rem] bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)] disabled:opacity-50 text-xs tracking-wide"
          >
            <TriangleAlert className="h-4 w-4" strokeWidth={2.5} /> Emergency Power Cut
          </button>
        </div>
      </div>
    </div>
  );
}
