import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Cpu, DoorOpen, Info, Plus, FolderPlus, ArrowLeft } from "lucide-react";
import { SciFiCard } from "@/components/ui/sci-fi-card";

export const Route = createFileRoute("/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-white/40 dark:bg-card rounded-full hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-blue-200 dark:border-border/20">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight">Devices & Rooms</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Link to="/all-devices" className="block">
            <SciFiCard color="blue" className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all hover:scale-105 h-full">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-600 dark:text-blue-400">
                <Cpu className="h-6 w-6" />
              </span>
              <span className="text-sm font-bold text-foreground">All Devices</span>
            </SciFiCard>
          </Link>
          <Link to="/rooms" className="block">
            <SciFiCard color="purple" className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all hover:scale-105 h-full">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-purple-600 dark:text-purple-400">
                <DoorOpen className="h-6 w-6" />
              </span>
              <span className="text-sm font-bold text-foreground">Rooms</span>
            </SciFiCard>
          </Link>
          <Link to="/add-device" className="block">
            <SciFiCard color="emerald" className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all hover:scale-105 h-full">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-emerald-600 dark:text-emerald-500">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-sm font-bold text-foreground">Add Device</span>
            </SciFiCard>
          </Link>
          <Link to="/add-room" className="block">
            <SciFiCard color="orange" className="flex flex-col items-center justify-center gap-3 p-6 text-center transition-all hover:scale-105 h-full">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)] text-orange-600 dark:text-orange-500">
                <FolderPlus className="h-6 w-6" />
              </span>
              <span className="text-sm font-bold text-foreground">Add Room</span>
            </SciFiCard>
          </Link>
        </div>
      </div>
    </div>
  );
}
