import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/fridge-remote")({
  component: FridgeRemotePage,
});

function FridgeRemotePage() {
  const [fridgeTemps, setFridgeTemps] = useState([3]);
  const [freezerTemps, setFreezerTemps] = useState([-18]);
  const [iceMaker, setIceMaker] = useState("Cubed");
  const [fridgeMode, setFridgeMode] = useState("Normal");

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Link to="/remotes" className="p-2 -ml-2 rounded-full bg-white/40 dark:bg-card hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-blue-200 dark:border-border/20">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Smart Fridge</h1>
            <p className="text-sm font-medium text-muted-foreground">Temperature, Ice Maker, Settings</p>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-8 rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-6 mx-auto max-w-sm shadow-sm">
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <p className="text-sm font-semibold text-muted-foreground">Fridge</p>
              <p className="text-xl font-bold text-teal-400">{fridgeTemps[0]}°C</p>
            </div>
            <Slider value={fridgeTemps} min={1} max={7} step={1} onValueChange={setFridgeTemps} className="[&>span:first-child]:bg-teal-500/20 [&_[role=slider]]:border-teal-500 [&_[role=slider]]:bg-teal-950 [&>span:first-child>span]:bg-teal-500" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <p className="text-sm font-semibold text-muted-foreground">Freezer</p>
              <p className="text-xl font-bold text-blue-400">{freezerTemps[0]}°C</p>
            </div>
            <Slider value={freezerTemps} min={-24} max={-14} step={1} onValueChange={setFreezerTemps} className="[&>span:first-child]:bg-blue-500/20 [&_[role=slider]]:border-blue-500 [&_[role=slider]]:bg-blue-950 [&>span:first-child>span]:bg-blue-500" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Ice Maker</p>
          <div className="flex bg-secondary/50 p-1 rounded-[1.5rem]">
            {['Cubed', 'Crushed', 'Off'].map(m => (
              <button 
                key={m} 
                onClick={() => setIceMaker(m)}
                className={cn("flex-1 py-2 text-sm font-medium rounded-[1rem] transition-all", iceMaker === m ? "bg-teal-500/20 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]" : "text-neutral-500 hover:text-muted-foreground")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Mode</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setFridgeMode('Quick Cool'); toast.success('Quick Cool activated'); }} className={cn("py-3 rounded-[1rem] border border-border/20 text-sm font-medium transition-all active:scale-95", fridgeMode === 'Quick Cool' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-secondary/50 text-muted-foreground")}>Quick Cool</button>
            <button onClick={() => { setFridgeMode('Energy Saver'); toast.success('Energy Saver activated'); }} className={cn("py-3 rounded-[1rem] border border-border/20 text-sm font-medium transition-all active:scale-95", fridgeMode === 'Energy Saver' ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-secondary/50 text-muted-foreground")}>Energy Saver</button>
          </div>
        </div>

      </div>
    </div>
  </div>
  );
}
