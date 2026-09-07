import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PlugZap,
  Power,
  Moon,
  ShieldCheck,
  Leaf,
  OctagonAlert,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";

export const Route = createFileRoute("/actions")({
  component: ActionsPage,
});

function ActionsPage() {
  const { dispatch, canEdit } = useHome();

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Quick Actions</h1>
          <p className="text-sm font-medium text-muted-foreground">Trigger whole-home scenes instantly.</p>
        </div>

      <div className="grid grid-cols-2 gap-4">
        <QuickAction
          icon={Power}
          label="All Off"
          onClick={() => {
            dispatch({ type: "ALL_OFF" });
            toast.success("All non-critical devices off");
          }}
          disabled={!canEdit}
        />
        <QuickAction
          icon={Moon}
          label="Night Mode"
          onClick={() => {
            dispatch({ type: "NIGHT_MODE" });
            toast.success("Night Mode on");
          }}
          disabled={!canEdit}
        />
        <QuickAction
          icon={ShieldCheck}
          label="Away Mode"
          onClick={() => {
            dispatch({ type: "AWAY_MODE" });
            toast.success("Away Mode armed");
          }}
          disabled={!canEdit}
        />
        <QuickAction
          icon={Leaf}
          label="Energy Saver"
          onClick={() => {
            dispatch({ type: "ENERGY_SAVER" });
            toast.success("Energy Saver applied");
          }}
          disabled={!canEdit}
        />
      </div>
      
      <div className="pt-4">
        <EmergencyAction
          disabled={!canEdit}
          onConfirm={() => {
            dispatch({ type: "EMERGENCY" });
            toast.error("Emergency shutdown executed");
          }}
        />
      </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Power;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-3 rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card py-6 text-sm font-bold text-foreground transition-all hover:bg-white/60 dark:hover:bg-purple-900/40 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm group"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/50 text-foreground transition-transform group-hover:scale-110">
        <Icon className="h-6 w-6" />
      </span>
      {label}
    </button>
  );
}

function EmergencyAction({ onConfirm, disabled }: { onConfirm: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          disabled={disabled}
          className="flex w-full flex-col items-center gap-3 rounded-[2rem] bg-red-500/10 border border-red-500/20 py-6 text-sm font-bold text-red-500 transition-all hover:bg-red-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.1)] group"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-500 transition-transform group-hover:scale-110 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <OctagonAlert className="h-6 w-6" />
          </span>
          Emergency Shutdown
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-destructive" /> Emergency Shutdown?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This immediately cuts power to all non-critical devices (the refrigerator stays on).
            Safety overrides automation. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Shut down now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
