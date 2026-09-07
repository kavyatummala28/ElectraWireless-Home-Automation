import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DeviceTile } from "@/components/home/DeviceTile";
import { useHome } from "@/lib/home/store";

export const Route = createFileRoute("/all-devices")({
  head: () => ({
    meta: [
      { title: "All Devices, ELLY Home" },
      { name: "description", content: "View and control all devices." },
    ],
  }),
  component: AllDevicesPage,
});

function AllDevicesPage() {
  const { state } = useHome();
  const router = useRouter();

  const activeCount = state.devices.filter((d) => d.on).length;

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.history.back()}
            className="p-2 bg-white/40 dark:bg-card rounded-full hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-blue-200 dark:border-border/20"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">All Devices</h1>
            <p className="text-sm font-medium text-muted-foreground">
              {activeCount} of {state.devices.length} active
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {state.devices.map((d) => (
            <DeviceTile key={d.id} device={d} />
          ))}
        </div>
      </div>
    </div>
  );
}
