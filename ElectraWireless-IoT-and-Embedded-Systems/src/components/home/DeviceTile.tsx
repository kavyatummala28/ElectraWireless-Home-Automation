import { Link, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useHome } from "@/lib/home/store";
import type { Device } from "@/lib/home/types";
import { deviceIcon } from "./device-icons";
import { SignalIndicator } from "./SignalIndicator";

export function DeviceTile({ device }: { device: Device }) {
  const router = useRouter();
  const { dispatch, toggleDevice, canEdit } = useHome();
  const Icon = deviceIcon[device.type];
  const status = !device.online
    ? "Offline"
    : device.on
      ? "On"
      : device.type === "sensor"
        ? "Idle"
        : "Off";

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 24 }}
      className={cn(
        "group relative flex flex-col gap-3 rounded-[2rem] p-4 transition-colors",
        device.on ? "bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      <div className="flex items-start justify-between">
        <motion.div
          animate={device.on ? { scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[1.5rem] transition-colors",
            device.on
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
        <div className="flex items-center gap-2">
          <SignalIndicator online={device.online} />
          <Link
            to="/device/$deviceId"
            params={{ deviceId: device.id }}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              device.on
                ? "text-primary-foreground/70 hover:text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Advanced controls"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div>
        <p className="font-semibold leading-tight">{device.name}</p>
        <p
          className={cn(
            "text-xs",
            device.on ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {status} · {device.on ? device.watts : 0} W
        </p>
      </div>

      <div className="flex items-center justify-between">
        {device.type === "light" && device.on ? (
          <input
            type="range"
            min={0}
            max={100}
            value={device.brightness ?? 0}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_DEVICE",
                id: device.id,
                patch: { brightness: Number(e.target.value) },
              })
            }
            className="mr-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-primary-foreground/25 accent-white"
            aria-label="Brightness"
          />
        ) : (
          <span
            className={cn(
              "text-xs",
              device.on ? "text-primary-foreground/60" : "text-muted-foreground",
            )}
          >
            {device.id}
          </span>
        )}
        {device.type !== "sensor" && (
          <Switch
            checked={device.on}
            disabled={!canEdit}
            onCheckedChange={async () => {
              const res = await toggleDevice(device.id);
              if (res === "REDIRECT") {
                router.navigate({ to: "/device/$deviceId", params: { deviceId: device.id } });
              }
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
