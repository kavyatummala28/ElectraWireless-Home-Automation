import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
  User,
  Tv,
  LogOut
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
import { AuthProvider, useAuth } from "@/lib/auth";
import { LoginScreen } from "@/components/home/LoginScreen";

const nav = [
  { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/remotes", label: "Remotes", icon: Tv, exact: false },
  { to: "/automations", label: "Flows", icon: Workflow, exact: false },
  { to: "/energy", label: "Energy", icon: Gauge, exact: false },
  { to: "/camera", label: "Vision", icon: Video, exact: false },
  { to: "/settings", label: "Settings", icon: Settings, exact: false },
] as const;

import { autoConnectBluetooth } from "@/lib/home/bluetooth";
import { DevicePairingDialog } from "@/components/home/DevicePairingDialog";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}

// Shows the login screen until someone signs in
function AuthGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <LoginScreen />;
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
  const { user, logout } = useAuth();

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
    <div className="relative flex h-[100dvh] w-full justify-center overflow-hidden bg-secondary/50 dark:bg-[#030207]">
      {/* Phone-sized app column */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden bg-background ring-1 ring-white/5">
        {/* Ambient glow inside the app, so glass cards have something to frost */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div aria-hidden className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/25 blur-[100px]" />
          <div aria-hidden className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[#7C3AED]/20 blur-[110px]" />
          <div aria-hidden className="absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-[#C084FC]/15 blur-[120px]" />
        </div>

        {/* Header */}
        <header className="relative z-20 border-b border-white/5 glass">
          <div className="flex items-center justify-between px-4 pt-3 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Logo className="w-10 h-10 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-muted-foreground leading-none">Welcome back</p>
                <p className="truncate font-display text-base font-bold leading-tight mt-0.5">{user?.name}</p>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-secondary/50"
                    aria-label="Account"
                  >
                    <Settings className="h-5 w-5 text-foreground/80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card">
                  <DropdownMenuLabel>Signed in as {user?.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content (no re-mount animation, keeps navigation instant) */}
                   <main className="app-main relative z-10 flex flex-1 flex-col overflow-y-auto no-scrollbar px-4 pb-4 pt-5">
             {children}
             {/* empty space so the last card can scroll above the floating nav bar */}
             <div aria-hidden className="h-24 shrink-0" />
           </main>

        {/* Floating glass navigation bar */}
                <nav className="relative z-50 mx-3 mb-3 mt-1 shrink-0 flex items-center justify-around rounded-[1.75rem] border border-white/10 glass px-1.5 py-1.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]">
          {nav.map((item) => {
            const active = item.exact
              ? path === item.to
              : path.startsWith(item.to) || (item.to === "/remotes" && path.endsWith("-remote"));
            return (
              <Link
                key={item.to}
                to={item.to}
                preload="render"
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] py-2 text-[10px] font-semibold transition-colors duration-200",
                  active ? "text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-primary/90 to-[#7C3AED] shadow-[0_6px_20px_-6px_rgba(124,58,237,0.8)]"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <item.icon className="relative h-[18px] w-[18px] shrink-0" />
                <span className="relative">{item.label}</span>
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