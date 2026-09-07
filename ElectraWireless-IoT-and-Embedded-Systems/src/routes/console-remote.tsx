import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Power, BatteryMedium, Disc } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console-remote")({
  component: ConsoleRemotePage,
});

function ConsoleRemotePage() {
  const [consoleState, setConsoleState] = useState("Standby");
  const handleAction = (msg: string) => toast.success(msg);

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Link to="/remotes" className="p-2 -ml-2 rounded-full bg-white/40 dark:bg-card hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-blue-200 dark:border-border/20">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Game Console</h1>
            <p className="text-sm font-medium text-muted-foreground">PlayStation 5 • {consoleState}</p>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-8 rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-6 mx-auto max-w-sm shadow-sm">
        
        {/* Power States */}
        <div className="flex gap-3">
          <button 
            onClick={() => { setConsoleState('Active'); toast.success('Waking Console...'); }}
            className={cn("flex-1 py-4 rounded-[1.5rem] flex flex-col items-center gap-2 transition-all active:scale-95 border border-border/20", consoleState === 'Active' ? "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "bg-secondary/50 text-muted-foreground")}
          >
            <Power className="w-6 h-6" />
            <span className="text-xs font-semibold">Wake</span>
          </button>
          <button 
            onClick={() => { setConsoleState('Standby'); toast.success('Console set to Rest Mode'); }}
            className={cn("flex-1 py-4 rounded-[1.5rem] flex flex-col items-center gap-2 transition-all active:scale-95 border border-border/20", consoleState === 'Standby' ? "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "bg-secondary/50 text-muted-foreground")}
          >
            <Power className="w-6 h-6 rotate-90" />
            <span className="text-xs font-semibold">Rest</span>
          </button>
          <button 
            onClick={() => { setConsoleState('Off'); toast.success('Console Powered Off'); }}
            className={cn("flex-1 py-4 rounded-[1.5rem] flex flex-col items-center gap-2 transition-all active:scale-95 border border-border/20", consoleState === 'Off' ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "bg-secondary/50 text-muted-foreground")}
          >
            <Power className="w-6 h-6" />
            <span className="text-xs font-semibold">Off</span>
          </button>
        </div>

        {/* Status Info */}
        <div className="flex justify-between items-center bg-secondary/40 p-4 rounded-[1.5rem] border border-border/20">
           <div className="flex items-center gap-3">
             <BatteryMedium className="w-6 h-6 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
             <div>
               <p className="text-sm font-semibold text-neutral-200">Controller 1</p>
               <p className="text-xs text-neutral-500">65% • Charging</p>
             </div>
           </div>
           <button onClick={() => handleAction('Disc Ejected')} className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition text-muted-foreground">
             <Disc className="w-5 h-5" />
           </button>
        </div>

        {/* Quick Launch Games */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Recent Games</p>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleAction('Launching Game 1')} className="aspect-square rounded-[1.5rem] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center hover:scale-[1.02] active:scale-95 transition shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition" />
              <span className="relative z-10 font-bold text-foreground drop-shadow-md text-sm">RPG</span>
            </button>
            <button onClick={() => handleAction('Launching Game 2')} className="aspect-square rounded-[1.5rem] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center hover:scale-[1.02] active:scale-95 transition shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=200')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition" />
              <span className="relative z-10 font-bold text-foreground drop-shadow-md text-sm">RACING</span>
            </button>
            <button onClick={() => handleAction('Launching App')} className="aspect-square rounded-[1.5rem] bg-secondary/80 border border-border/20 flex items-center justify-center hover:scale-[1.02] active:scale-95 transition shadow-lg text-muted-foreground hover:text-foreground">
              <span className="font-bold text-sm">MEDIA</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
  );
}
