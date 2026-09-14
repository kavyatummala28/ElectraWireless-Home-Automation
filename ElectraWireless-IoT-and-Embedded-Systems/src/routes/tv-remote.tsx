import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Power,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  Volume2,
  Search,
  Wifi,
  AlertTriangle,
  Pencil,
  X,
  Mic,
  Settings,
  Undo2,
  Home as HomeIcon,
  LayoutGrid,
  Plus,
  Minus,
  Grid3x3,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHome } from "@/lib/home/store";
import { autoDiscoverPanasonicTV, sendPanasonicCommand, PANASONIC_KEYS } from "@/lib/panasonic";
import { autoDiscoverSamsungTV, sendSamsungCommand, SAMSUNG_KEYS } from "@/lib/samsung";
import { autoDiscoverLGTV, sendLGCommand, launchLGApp, LG_KEYS, LG_APPS } from "@/lib/lg-tv";

export const Route = createFileRoute("/tv-remote")({
  component: TvRemotePage,
});

type TvBrand = 'panasonic' | 'samsung' | 'lg' | null;
type RemoteKeyId =
  | keyof typeof PANASONIC_KEYS
  | keyof typeof SAMSUNG_KEYS
  | keyof typeof LG_KEYS;

function TvRemotePage() {
  const [tvOn, setTvOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [tvIp, setTvIp] = useState<string | null>(localStorage.getItem("tv_ip") || localStorage.getItem("panasonic_ip"));
  const [tvBrand, setTvBrand] = useState<TvBrand>((localStorage.getItem("tv_brand") as TvBrand) || (localStorage.getItem("panasonic_ip") ? 'panasonic' : null));
  const [showKeypad, setShowKeypad] = useState(false);
  const { state } = useHome();

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualIp, setManualIp] = useState("");
  const [manualBrand, setManualBrand] = useState<Exclude<TvBrand, null>>("panasonic");

  const connectManually = () => {
    const ip = manualIp.trim();
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ip)) {
      toast.error("Enter a valid IP address, e.g. 192.168.1.42");
      return;
    }
    setTvIp(ip);
    setTvBrand(manualBrand);
    localStorage.setItem("tv_ip", ip);
    localStorage.setItem("tv_brand", manualBrand);
    setShowManualEntry(false);
    const brandName =
      manualBrand === "panasonic"
        ? "Panasonic"
        : manualBrand === "samsung"
          ? "Samsung"
          : "LG webOS";

    toast.success(`Connected to ${brandName} TV at ${ip}`);
  };

  const handleAction = async (msg: string, keyId: RemoteKeyId) => {
    if (state.appMode === "demo" || !tvIp || !tvBrand) {
      toast.success(msg);
      return;
    }

    let success = false;

    if (tvBrand === 'samsung') {
      const keyCommand = SAMSUNG_KEYS[keyId as keyof typeof SAMSUNG_KEYS];
      if (keyCommand) {
        success = await sendSamsungCommand(tvIp, keyCommand);
      }
    } else if (tvBrand === 'panasonic') {
      const keyCommand = PANASONIC_KEYS[keyId as keyof typeof PANASONIC_KEYS];
      if (keyCommand) {
        success = await sendPanasonicCommand(tvIp, keyCommand);
      }
    } else if (tvBrand === 'lg') {
      const keyCommand = LG_KEYS[keyId as keyof typeof LG_KEYS];
      if (keyCommand) {
        success = await sendLGCommand(tvIp, keyCommand);
      }
    }

    if (!success) {
      if (tvBrand === 'samsung') {
        toast.error(`Failed to send command. (Check TV screen for pairing prompt!)`);
      } else {
        toast.error(`Failed to send command. Is the TV on?`);
      }
    }
  };

  const handleLaunchApp = async (name: string, appId: string) => {
    if (state.appMode === "demo" || !tvIp || tvBrand !== "lg") {
      toast.success(`Opening ${name}`);
      return;
    }
    const success = await launchLGApp(tvIp, appId);
    if (success) {
      toast.success(`Opening ${name}`);
    } else {
      toast.error(`Couldn't launch ${name}. Is the TV on?`);
    }
  };

  const startAutoDiscovery = async () => {
    setIsScanning(true);
    toast("Scanning local network for Smart TVs...");

    let samsungIp = await autoDiscoverSamsungTV();
    let panasonicIp = null;

    if (!samsungIp) {
      panasonicIp = await autoDiscoverPanasonicTV();
    }

    if (samsungIp) {
      setTvIp(samsungIp);
      setTvBrand('samsung');
      localStorage.setItem("tv_ip", samsungIp);
      localStorage.setItem("tv_brand", 'samsung');
      toast.success(`Connected to Samsung TV at ${samsungIp}`);
    } else if (panasonicIp) {
      setTvIp(panasonicIp);
      setTvBrand('panasonic');
      localStorage.setItem("tv_ip", panasonicIp);
      localStorage.setItem("tv_brand", 'panasonic');
      toast.success(`Connected to Panasonic TV at ${panasonicIp}`);
    } else {
      toast.error("TV not found on network. Ensure 'Network Remote' is ON in TV settings.", {
        duration: 8000,
        icon: <AlertTriangle className="text-destructive h-5 w-5" />
      });
    }

    setIsScanning(false);
  };

  const getTvName = () => {
    if (tvBrand === 'samsung') return "Samsung Smart TV";
    if (tvBrand === 'panasonic') return "Panasonic Viera Smart TV";
    if (tvBrand === 'lg') return "LG webOS Smart TV";
    return "Smart TV Unpaired";
  };

  return (
    <div className="bg-background min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/remotes" className="p-2 -ml-2 rounded-full bg-card hover:bg-secondary transition-colors border border-border/20">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Living Room TV</h1>
              <p className="text-sm font-medium text-muted-foreground">{getTvName()}</p>
            </div>
          </div>

          {state.appMode === "live" && (
            <div className="flex items-center gap-2">
              <button
                onClick={startAutoDiscovery}
                disabled={isScanning}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                  tvIp
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/20",
                  isScanning && "opacity-50 cursor-not-allowed animate-pulse"
                )}
              >
                {isScanning ? <Search className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                {isScanning ? "SCANNING..." : tvIp ? "CONNECTED" : "AUTO-CONNECT"}
              </button>
              <button
                onClick={() => { setManualIp(tvIp || ""); setManualBrand(tvBrand || "panasonic"); setShowManualEntry(true); }}
                title="Enter TV IP manually"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-foreground/70 border border-border/20 hover:bg-secondary/80 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {state.appMode === "live" && showManualEntry && (
          <div className="rounded-2xl border border-border/20 glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Connect Manually</h3>
              <button onClick={() => setShowManualEntry(false)} className="p-1 rounded-full hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Find this in your TV's Network settings, or in your router's connected-devices list.
            </p>
            <div className="flex gap-2">
              <select
                value={manualBrand}
                onChange={(e) => setManualBrand(e.target.value as Exclude<TvBrand, null>)}
                className="rounded-xl bg-secondary/50 border border-border/20 px-3 py-2 text-sm font-medium"
              >
                <option value="panasonic">Panasonic</option>
                <option value="samsung">Samsung</option>
                <option value="lg">LG webOS</option>
              </select>
              <input
                type="text"
                inputMode="decimal"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="192.168.1.42"
                className="flex-1 rounded-xl bg-secondary/50 border border-border/20 px-3 py-2 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <button
              onClick={connectManually}
              className="w-full py-2.5 rounded-xl bg-blue-500 text-white font-bold text-sm active:scale-95 transition-all"
            >
              Connect
            </button>
          </div>
        )}

        <div className="pt-5 flex flex-col items-center gap-5 rounded-[2.5rem] border border-border/20 glass-card p-6 mx-auto max-w-[320px] shadow-sm relative overflow-hidden">

          {state.appMode === "live" && !tvIp && !isScanning && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
              <Wifi className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-bold text-lg mb-2">TV Not Connected</h3>
              <p className="text-sm text-muted-foreground mb-6">Tap Auto-Connect to scan your local Wi-Fi for your Smart TV.</p>
              <button onClick={startAutoDiscovery} className="px-6 py-3 bg-blue-500 text-white rounded-[1rem] font-bold shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 transition-all">
                Start Scan
              </button>
              <button
                onClick={() => { setManualIp(""); setManualBrand("panasonic"); setShowManualEntry(true); }}
                className="mt-3 text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Or enter TV IP manually
              </button>
            </div>
          )}

          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => {
                setTvOn(!tvOn);
                handleAction(`TV turned ${!tvOn ? 'ON' : 'OFF'}`, 'POWER');
              }}
              className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md", tvOn ? "bg-red-500 text-foreground shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-secondary text-muted-foreground")}
            >
              <Power className="w-5 h-5" />
            </button>

            <button
              onClick={() => toast("Opening TV Settings")}
              className="w-10 h-10 rounded-full bg-secondary/60 border border-border/20 flex items-center justify-center text-foreground/70 hover:bg-secondary transition active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button onClick={() => handleAction('Input Source', 'SOURCE')} className="px-4 h-12 rounded-full bg-secondary text-foreground/80 text-xs font-bold active:scale-95 transition hover:bg-secondary/80">
              INPUT
            </button>
          </div>

          <button
            onClick={() => toast('🎙️ Say "Hi LG" or hold the mic button on your remote')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-secondary/50 border border-border/20 hover:bg-secondary/80 transition active:scale-95"
          >
            <Mic className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-foreground/80">Voice Search</span>
          </button>

          <div className="relative w-52 h-52 bg-secondary/30 rounded-full flex items-center justify-center p-2 shadow-inner border border-border/20">
            <button onClick={() => handleAction('Up', 'UP')} className="absolute top-2 w-16 h-12 flex items-center justify-center rounded-[1.5rem] hover:bg-secondary/50 active:bg-secondary transition text-foreground/80"><ChevronUp className="w-7 h-7" /></button>
            <button onClick={() => handleAction('Down', 'DOWN')} className="absolute bottom-2 w-16 h-12 flex items-center justify-center rounded-[1.5rem] hover:bg-secondary/50 active:bg-secondary transition text-foreground/80"><ChevronDown className="w-7 h-7" /></button>
            <button onClick={() => handleAction('Left', 'LEFT')} className="absolute left-2 w-12 h-16 flex items-center justify-center rounded-[1.5rem] hover:bg-secondary/50 active:bg-secondary transition text-foreground/80"><ChevronLeft className="w-7 h-7" /></button>
            <button onClick={() => handleAction('Right', 'RIGHT')} className="absolute right-2 w-12 h-16 flex items-center justify-center rounded-[1.5rem] hover:bg-secondary/50 active:bg-secondary transition text-foreground/80"><ChevronRight className="w-7 h-7" /></button>
            <button onClick={() => handleAction('OK', 'OK')} className="w-[4.5rem] h-[4.5rem] rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-base active:scale-95 transition shadow-sm border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">OK</button>
          </div>

          <div className="flex items-center justify-center gap-4 w-full">
            <button onClick={() => handleAction('Back', 'RETURN')} className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition hover:bg-secondary/80 text-foreground/80">
              <Undo2 className="w-5 h-5" />
            </button>
            <button onClick={() => handleAction('Home', 'HOME')} className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center active:scale-95 transition hover:bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
              <HomeIcon className="w-6 h-6" />
            </button>
            <button
              onClick={() => handleAction('Apps', tvBrand === 'lg' ? 'HOME' : 'APPS')}
              className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center active:scale-95 transition hover:bg-purple-500/20"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-end justify-center gap-8 w-full">
            <div className="flex flex-col items-center bg-secondary/50 rounded-full py-2 px-1.5 shadow-sm border border-border/20">
              <button onClick={() => handleAction('Volume Up', 'VOL_UP')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/80 active:scale-95 transition text-foreground/80"><Plus className="w-4 h-4" /></button>
              <Volume2 className="w-4 h-4 my-2 text-muted-foreground" />
              <button onClick={() => handleAction('Volume Down', 'VOL_DOWN')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/80 active:scale-95 transition text-foreground/80"><Minus className="w-4 h-4" /></button>
            </div>

            <button onClick={() => handleAction('Mute', 'MUTE')} className="w-11 h-11 mb-6 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition hover:bg-secondary/80 text-foreground/80"><VolumeX className="w-4.5 h-4.5" /></button>

            <div className="flex flex-col items-center bg-secondary/50 rounded-full py-2 px-1.5 shadow-sm border border-border/20">
              <button onClick={() => handleAction('Channel Up', 'CH_UP')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/80 active:scale-95 transition text-foreground/80"><Plus className="w-4 h-4" /></button>
              <span className="text-[9px] font-bold my-2 text-muted-foreground tracking-widest">CH</span>
              <button onClick={() => handleAction('Channel Down', 'CH_DOWN')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/80 active:scale-95 transition text-foreground/80"><Minus className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="w-full">
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2 text-center">QUICK LAUNCH</p>
            <div className="grid grid-cols-4 gap-3">
              <button onClick={() => handleLaunchApp('Netflix', LG_APPS.NETFLIX)} className="flex flex-col items-center gap-1 active:scale-95 transition">
                <span className="w-11 h-11 rounded-2xl bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center text-[#E50914] font-black text-sm">N</span>
                <span className="text-[9px] text-muted-foreground font-medium">Netflix</span>
              </button>
              <button onClick={() => handleLaunchApp('Prime Video', LG_APPS.PRIME_VIDEO)} className="flex flex-col items-center gap-1 active:scale-95 transition">
                <span className="w-11 h-11 rounded-2xl bg-[#00A8E1]/15 border border-[#00A8E1]/30 flex items-center justify-center text-[#00A8E1] font-black text-sm">P</span>
                <span className="text-[9px] text-muted-foreground font-medium">Prime</span>
              </button>
              <button onClick={() => handleLaunchApp('YouTube', LG_APPS.YOUTUBE)} className="flex flex-col items-center gap-1 active:scale-95 transition">
                <span className="w-11 h-11 rounded-2xl bg-[#FF0000]/15 border border-[#FF0000]/30 flex items-center justify-center text-[#FF0000] font-black text-sm">Y</span>
                <span className="text-[9px] text-muted-foreground font-medium">YouTube</span>
              </button>
              <button onClick={() => handleLaunchApp('Disney+', LG_APPS.DISNEY_PLUS)} className="flex flex-col items-center gap-1 active:scale-95 transition">
                <span className="w-11 h-11 rounded-2xl bg-[#113CCF]/15 border border-[#113CCF]/30 flex items-center justify-center text-[#113CCF] font-black text-sm">D+</span>
                <span className="text-[9px] text-muted-foreground font-medium">Disney+</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowKeypad((v) => !v)}
            className="w-full py-2.5 rounded-full bg-secondary/50 text-xs font-bold text-foreground/70 flex items-center justify-center gap-2 hover:bg-secondary/80 transition active:scale-95"
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            {showKeypad ? 'Hide Keypad' : 'Number Keypad'}
          </button>

          {showKeypad && (
            <div className="w-full grid grid-cols-3 gap-3">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} onClick={() => handleAction(`Channel ${n}`, `NUM_${n}` as RemoteKeyId)} className="h-12 rounded-[1rem] bg-secondary/50 text-foreground/80 font-semibold active:scale-95 transition hover:bg-secondary">{n}</button>
              ))}
              <div />
              <button onClick={() => handleAction(`Channel 0`, 'NUM_0')} className="h-12 rounded-[1rem] bg-secondary/50 text-foreground/80 font-semibold active:scale-95 transition hover:bg-secondary">0</button>
              <div />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}