import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cpu, Server, Activity, ArrowDown } from "lucide-react";
import { SciFiCard } from "@/components/ui/sci-fi-card";

export const Route = createFileRoute("/settings-gateways")({
  component: SettingsGatewaysPage,
});

function SettingsGatewaysPage() {
  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 bg-white/40 dark:bg-card rounded-full hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-orange-200 dark:border-border/20">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight">Gateways</h1>
        </div>

        <div className="flex flex-col items-center gap-2 py-4 mt-2">
          <SciFiCard color="orange" className="flex w-full items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/40 dark:bg-secondary text-orange-600 dark:text-foreground/80 border border-orange-200 dark:border-border/20"><Cpu className="h-5 w-5" /></div>
            <div className="text-left"><p className="font-bold text-sm text-foreground">Smart Appliances</p><p className="text-xs font-medium text-muted-foreground mt-0.5">Wi-Fi · BLE · Zigbee · Matter</p></div>
          </SciFiCard>
          
          <ArrowDown className="h-5 w-5 text-neutral-600 my-1" strokeWidth={2.5} />
          
          <SciFiCard color="purple" glow className="flex w-full items-center gap-4 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 pointer-events-none" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] z-10"><Server className="h-5 w-5" /></div>
            <div className="text-left z-10"><p className="font-bold text-sm text-foreground">Local Integration Gateway</p><p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-0.5">Home Assistant · MQTT Broker</p></div>
          </SciFiCard>
          
          <ArrowDown className="h-5 w-5 text-neutral-600 my-1" strokeWidth={2.5} />
          
          <SciFiCard color="blue" className="flex w-full items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/40 dark:bg-secondary text-blue-600 dark:text-foreground/80 border border-blue-200 dark:border-border/20"><Activity className="h-5 w-5" /></div>
            <div className="text-left"><p className="font-bold text-sm text-foreground">ELLY AI Engine</p><p className="text-xs font-medium text-muted-foreground mt-0.5">Local Edge Inference</p></div>
          </SciFiCard>
        </div>
      </div>
    </div>
  );
}
