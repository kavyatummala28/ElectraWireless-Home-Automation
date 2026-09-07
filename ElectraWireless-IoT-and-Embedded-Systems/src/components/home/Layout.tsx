import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Workflow,
  Gauge,
  Video,
  Settings,
  Moon,
  Sun,
  Bell,
  Menu,
  ClipboardList,
  PowerOff,
  Power,
  User
} from "lucide-react";
import { KeepAwake } from '@capacitor-community/keep-awake';
import { useHeyElly, enableBackgroundListening, disableBackgroundListening } from "@/hooks/useHeyElly";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useHome } from "@/lib/home/store";
import { EllyLogo } from "@/components/elly/EllyLogo";
import { EllyProvider, useElly } from "@/components/elly/EllyContext";
import { Toaster } from "@/components/ui/sonner";
import { Logo } from "@/components/Logo";

const nav = [
  { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/automations", label: "Flows", icon: Workflow, exact: false },
  { to: "/energy", label: "Energy", icon: Gauge, exact: false },
  { to: "/camera", label: "Vision", icon: Video, exact: false },
  { to: "/settings", label: "Settings", icon: Settings, exact: false },
] as const;

import { autoConnectBluetooth } from "@/lib/home/bluetooth";
import { DevicePairingDialog } from "@/components/home/DevicePairingDialog";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <EllyProvider>
      <LayoutInner>{children}</LayoutInner>
    </EllyProvider>
  );
}

function LayoutInner({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { alerts, state, switchMode } = useHome();
  const { openElly, open: isEllyOpen } = useElly();
  const { isListening } = useHeyElly({ onWakeWord: openElly, pause: isEllyOpen });
  const [bgEnabled, setBgEnabled] = useState(false);

  useEffect(() => {
    // Keep screen on permanently for 24/7 kiosk mode
    const keepAwake = async () => {
      try {
        await KeepAwake.keepAwake();
      } catch (e) {
        // Ignore if unsupported (e.g. on web)
      }
    };
    keepAwake();
    
    // Auto connect bluetooth if saved
    autoConnectBluetooth();
  }, []);

  const path = useRouterState({ select: (s) => s.location.pathname });
  // Always start new pages from the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  return (
    <div className="relative flex h-[100dvh] w-full justify-center overflow-hidden bg-secondary/50">
      {/* Ambient glassmorphic blobs for a modern techy vibe */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-50 mix-blend-screen dark:mix-blend-lighten">
        <div aria-hidden className="absolute -left-12 -top-12 h-96 w-96 rounded-full bg-primary/20 blur-[100px] dark:bg-primary/30" />
        <div aria-hidden className="absolute top-20 right-10 h-96 w-96 rounded-full bg-[#8B5CF6]/20 blur-[120px] dark:bg-[#7C3AED]/20" />
        <div aria-hidden className="absolute top-1/2 right-24 h-80 w-80 rounded-full bg-[#A78BFA]/15 blur-[90px] dark:bg-[#6D28D9]/30" />
        <div aria-hidden className="absolute bottom-1/3 left-20 h-96 w-96 rounded-full bg-[#C4B5FD]/20 blur-[120px] dark:bg-[#8B5CF6]/20" />
        <div aria-hidden className="absolute -bottom-10 left-1/3 h-72 w-72 rounded-full bg-primary/20 blur-[100px] dark:bg-[#7C3AED]/20" />
      </div>

      {/* Phone-sized app column */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden bg-background shadow-lg shadow-primary/5 ring-1 ring-border/60">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border/40 glass">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-10" />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold leading-none">
                  ElectraWireless
                </p>
                <p className="truncate text-[11px] text-muted-foreground mt-0.5">Welcome, Adil</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-secondary/50"
                onClick={toggle}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-full hover:bg-secondary/50"
                    aria-label="Alerts"
                  >
                    <Bell className="h-5 w-5 text-foreground/80" />
                    {alerts.length > 0 && (
                      <span className="absolute right-[6px] top-[6px] h-2 w-2 rounded-full bg-destructive border-2 border-background" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 glass-card">
                  <DropdownMenuLabel>Alerts & Warnings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {alerts.length === 0 ? (
                    <DropdownMenuItem disabled>All systems nominal</DropdownMenuItem>
                  ) : (
                    alerts.map((a) => (
                      <DropdownMenuItem key={a} className="text-sm">
                        <Badge variant="destructive" className="mr-2">!</Badge>{a}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-secondary/50"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5 text-foreground/80" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content (no re-mount animation, keeps navigation instant) */}
        <main className="flex flex-1 flex-col overflow-y-auto no-scrollbar px-4 pb-4 pt-5">{children}</main>

        {/* Bottom Navigation Bar */}
        <nav className="mt-auto shrink-0 z-50 flex items-center justify-around border-t border-border/40 bg-background/80 px-2 py-3 backdrop-blur-xl">
          {nav.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                preload="render"
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 p-2 text-[10px] font-medium transition-all duration-300",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-300",
                    active ? "bg-primary/10 px-4 py-1.5" : "bg-transparent px-2 py-1.5"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                </div>
                {active && <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* In-app notifications, constrained to the phone column */}
        <Toaster
          position="top-center"
          offset={16}
          mobileOffset={16}
          expand={true}
          richColors={true}
          style={{ position: "absolute" }}
        />
        <DevicePairingDialog />
      </div>
    </div>
  );
}
