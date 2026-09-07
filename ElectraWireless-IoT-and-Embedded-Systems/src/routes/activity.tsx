import { createFileRoute } from "@tanstack/react-router";
import { useHome } from "@/lib/home/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log, ELLY Home" },
      { name: "description", content: "View recent events and voice commands." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { state } = useHome();

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Activity Log</h1>
          <p className="text-sm font-medium text-muted-foreground">Recent events and system actions</p>
        </div>

        <div className="flex flex-col gap-2 rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-6 shadow-sm">
          {state.logs.length === 0 ? (
            <p className="text-muted-foreground text-sm font-medium">No recent activity.</p>
          ) : (
            state.logs.map((l) => (
              <div key={l.id} className="flex gap-4 py-2 border-b border-border/20 last:border-0 items-center">
                <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">{l.time}</span>
                <span
                  className={cn(
                    "text-sm",
                    l.source === "voice" && "text-purple-600 dark:text-purple-400 font-bold",
                    l.source === "system" && "text-foreground/80 font-medium",
                  )}
                >
                  {l.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
