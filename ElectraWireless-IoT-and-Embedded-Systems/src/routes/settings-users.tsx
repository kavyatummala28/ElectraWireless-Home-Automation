import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Users, UserRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/home/types";
import { MembersManager } from "@/components/home/MembersManager";
import { SciFiCard } from "@/components/ui/sci-fi-card";

export const Route = createFileRoute("/settings-users")({
  component: SettingsUsersPage,
});

const roles: { id: Role; label: string; icon: typeof Crown; perms: string[] }[] = [
  { id: "owner", label: "Owner", icon: Crown, perms: ["Full control", "Add / remove devices", "Create automations"] },
  { id: "family", label: "Family Member", icon: Users, perms: ["Control devices", "Limited automation editing"] },
  { id: "guest", label: "Guest", icon: UserRound, perms: ["Restricted device control", "No automation editing"] },
];

function SettingsUsersPage() {
  const { state, dispatch } = useHome();

  return (
    <div className="bg-slate-50 dark:bg-black flex-1 text-foreground pb-6 -mx-4 px-4 sm:-mx-8 sm:px-8 flex flex-col">
      <div className="mx-auto max-w-4xl w-full space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 bg-white dark:bg-card rounded-full hover:bg-white dark:bg-secondary/20 transition-colors border border-border/20">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight">Users & Access</h1>
        </div>
        <div className="grid gap-3 mt-4">
          {roles.map((r) => {
            const activeRole = state.role === r.id;
            return (
              <SciFiCard key={r.id} color="purple" glow={activeRole} className={cn("p-4", activeRole ? "border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "")}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-[1rem] border border-purple-500/20">
                    <r.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="font-bold text-foreground text-sm">{r.label}</p>
                  {activeRole && <span className="ml-auto px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-full tracking-wide uppercase">Active</span>}
                </div>
                <ul className="mb-4 space-y-2 text-xs text-slate-600 dark:text-muted-foreground font-medium px-2">
                  {r.perms.map((p) => (
                    <li key={p} className="flex items-center gap-2">• {p}</li>
                  ))}
                </ul>
                <button
                  className={cn("w-full py-2.5 rounded-[1rem] font-bold text-xs transition-all border", activeRole ? "bg-secondary/10 dark:bg-secondary/40 text-muted-foreground border-transparent" : "bg-purple-500 text-white hover:bg-purple-600 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]")}
                  disabled={activeRole}
                  onClick={() => {
                    dispatch({ type: "SET_ROLE", role: r.id });
                    toast.success(`Now acting as ${r.label}`);
                  }}
                >
                  {activeRole ? "Current role" : `Switch to ${r.label}`}
                </button>
              </SciFiCard>
            );
          })}
        </div>
        
        <div className="mt-8 border-t border-border/20 pt-6">
          <MembersManager />
        </div>
      </div>
    </div>
  );
}
