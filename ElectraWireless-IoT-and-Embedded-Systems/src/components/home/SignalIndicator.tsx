import { cn } from "@/lib/utils";

export function SignalIndicator({ online, className }: { online: boolean; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex h-3 w-3 items-center justify-center", className)}
      title={online ? "Online" : "Offline"}
    >
      {online && (
        <span className="signal-ring absolute inline-flex h-3 w-3 rounded-full bg-success/60" />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          online ? "bg-success" : "bg-muted-foreground/50",
        )}
      />
    </span>
  );
}
