import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DeviceTile } from "@/components/home/DeviceTile";
import { useHome } from "@/lib/home/store";

export const Route = createFileRoute("/room/$roomId")({
  head: () => ({
    meta: [
      { title: "Room Control, ELLY Home" },
      { name: "description", content: "Control every device in this room in real time." },
    ],
  }),
  component: RoomPage,
  notFoundComponent: () => <p className="p-6">Room not found.</p>,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const { state } = useHome();
  const router = useRouter();
  const room = state.rooms.find((r) => r.id === roomId);
  const devices = state.devices.filter((d) => d.roomId === roomId);

  if (!room) {
    return (
      <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6 pt-6 text-center">
          <p>Room not found.</p>
          <Link to="/" className="text-blue-500 hover:underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const watts = devices.filter((d) => d.on).reduce((s, d) => s + d.watts, 0);

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
            <h1 className="text-xl font-extrabold tracking-tight">{room.name}</h1>
            <p className="text-sm font-medium text-muted-foreground">
              {devices.filter((d) => d.on).length} of {devices.length} active · {watts} W in use
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {devices.map((d) => (
            <DeviceTile key={d.id} device={d} />
          ))}
        </div>
      </div>
    </div>
  );
}
