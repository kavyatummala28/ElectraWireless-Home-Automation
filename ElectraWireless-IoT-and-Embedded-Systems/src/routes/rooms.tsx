import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, DoorOpen } from "lucide-react";

import { useHome } from "@/lib/home/store";

export const Route = createFileRoute("/rooms")({
  component: RoomsPage,
});

function RoomsPage() {
  const { state } = useHome();

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Link
            to="/devices"
            className="p-2 bg-white/40 dark:bg-card rounded-full hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-blue-200 dark:border-border/20"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight">Rooms</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {state.rooms.map((room) => (
            <Link
              key={room.id}
              to="/room/$roomId"
              params={{ roomId: room.id }}
              className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-6 text-center text-sm font-semibold text-foreground transition-all hover:bg-white/60 dark:hover:bg-purple-900/40 hover:scale-[1.02] active:scale-95 shadow-sm group"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/50 text-foreground transition-transform group-hover:scale-110">
                <DoorOpen className="h-5 w-5" />
              </span>
              {room.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
