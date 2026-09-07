import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Power, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, VolumeX, Search, Wifi, AlertTriangle, Pencil, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHome } from "@/lib/home/store";
import { autoDiscoverPanasonicTV, sendPanasonicCommand, PANASONIC_KEYS } from "@/lib/panasonic";
import { autoDiscoverSamsungTV, sendSamsungCommand, SAMSUNG_KEYS } from "@/lib/samsung";
import { autoDiscoverLGTV, sendLGCommand, LG_KEYS } from "@/lib/lg-tv";

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
  const { state } = useHome();

  // --- Manual connect fallback (in case auto-discovery can't find the TV, e.g. on a locked-down network) ---
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
    
    // Live mode execution
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

  const startAutoDiscovery = async () => {
    setIsScanning(true);
    toast("Scanning local network for Smart TVs...");
    
    // Scan sequentially to avoid overwhelming the Android networking bridge
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

        {/* Manual IP entry panel — fallback for when auto-discovery can't reach the TV */}
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

        <div className="pt-4 flex flex-col items-center gap-8 rounded-[2rem] border border-border/20 glass-card p-6 mx-auto max-w-sm shadow-sm relative overflow-hidden">
        
        {/* Connection overlay if in live mode and not connected */}
        {state.appMode === "live" && !tvIp && !isScanning && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
            <Wifi className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-bold text-lg mb-2">TV Not Connected</h3>
            <p className="text-sm text-muted-foreground mb-6">Tap Auto-Connect to scan your local Wi-Fi for your Smart TV (Samsung or Panasonic).</p>
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

        {/* Power & Source */}
        <div className="flex justify-between w-full max-w-[280px]">
          <button 
            onClick={() => { 
              setTvOn(!tvOn); 
              handleAction(`TV turned ${!tvOn ? 'ON' : 'OFF'}`, 'POWER'); 
            }}
            className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md", tvOn ? "bg-red-500 text-foreground shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-secondary text-muted-foreground")}
          >
            <Power className="w-6 h-6" />
          </button>
          <button onClick={() => handleAction('Input Source', 'SOURCE')} className="px-5 h-14 rounded-full bg-secondary text-foreground/80 text-sm font-semibold active:scale-95 transition hover:bg-secondary/80">
            SOURCE
          </button>
        </div>

        {/* D-Pad */}
        <div className="relative w-56 h-56 bg-secondary/30 rounded-full flex items-center justify-center p-2 shadow-inner border border-border/20">
          <button onClick={() => handleAction('Up', 'UP')} className="absolute top-2 w-16 h-12 flex items-center justify-center rounded-[1.5rem] hover:bg-secondary/50 active:bg-secondary transition text-foreground/80"><ChevronUp className="w-8 h-8" /></button>
          <button onClick={() => handleAction('Down', 'DOWN')} className="absolute bottom-2 w-16 h-12 flex items-center justify-center rounded-[1.5rem] hover:bg-secondary/50 active:bg-secondary transition text-foreground/80"><ChevronDown className="w-8 h-8" /></button>
          <button onClick={() => handleAction('Left', 'LEFT')} className="absolute left-2 w-12 h-16 flex items-center justify-center rounded-[1.5rem] hover:bg-secondary/50 active:bg-secondary transition text-foreground/80"><ChevronLeft className="w-8 h-8" /></button>
          <button onClick={() => handleAction('Right', 'RIGHT')} className="absolute right-2 w-12 h-16 flex items-center justify-center rounded-[1.5rem] hover:bg-secondary/50 active:bg-secondary transition text-foreground/80"><ChevronRight className="w-8 h-8" /></button>
          <button onClick={() => handleAction('OK', 'OK')} className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-lg active:scale-95 transition shadow-sm border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">OK</button>
        </div>

        {/* Vol & CH */}
        <div className="flex gap-12 w-full justify-center">
          <div className="flex flex-col items-center bg-secondary/50 rounded-full p-2 shadow-sm border border-border/20">
            <button onClick={() => handleAction('Volume Up', 'VOL_UP')} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-secondary/80 active:scale-95 transition text-foreground/80"><ChevronUp className="w-5 h-5" /></button>
            <span className="text-[10px] font-bold my-2 text-muted-foreground tracking-widest">VOL</span>
            <button onClick={() => handleAction('Volume Down', 'VOL_DOWN')} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-secondary/80 active:scale-95 transition text-foreground/80"><ChevronDown className="w-5 h-5" /></button>
          </div>
          <button onClick={() => handleAction('Mute', 'MUTE')} className="w-12 h-12 mt-10 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition hover:bg-secondary/80 text-foreground/80"><VolumeX className="w-5 h-5" /></button>
          <div className="flex flex-col items-center bg-secondary/50 rounded-full p-2 shadow-sm border border-border/20">
            <button onClick={() => handleAction('Channel Up', 'CH_UP')} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-secondary/80 active:scale-95 transition text-foreground/80"><ChevronUp className="w-5 h-5" /></button>
            <span className="text-[10px] font-bold my-2 text-muted-foreground tracking-widest">CH</span>
            <button onClick={() => handleAction('Channel Down', 'CH_DOWN')} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-secondary/80 active:scale-95 transition text-foreground/80"><ChevronDown className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Keypad & Apps */}
        <div className="w-full max-w-[280px] grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handleAction(`Channel ${n}`, `NUM_${n}` as RemoteKeyId)} className="h-12 rounded-[1rem] bg-secondary/50 text-foreground/80 font-semibold active:scale-95 transition hover:bg-secondary">{n}</button>
          ))}
          <div />
          <button onClick={() => handleAction(`Channel 0`, 'NUM_0')} className="h-12 rounded-[1rem] bg-secondary/50 text-foreground/80 font-semibold active:scale-95 transition hover:bg-secondary">0</button>
          <div />
        </div>
        <div className="w-full max-w-[280px] grid grid-cols-2 gap-3 mt-2">
           <button onClick={() => handleAction('Apps', 'APPS')} className="h-12 rounded-[1rem] bg-purple-500/10 text-purple-500 font-bold active:scale-95 transition shadow-[0_0_10px_rgba(168,85,247,0.2)] border border-purple-500/20 hover:bg-purple-500/20">APPS</button>
           <button onClick={() => handleAction('Home', 'HOME')} className="h-12 rounded-[1rem] bg-blue-500/10 text-blue-500 font-bold active:scale-95 transition shadow-[0_0_10px_rgba(59,130,246,0.2)] border border-blue-500/20 hover:bg-blue-500/20">HOME</button>
        </div>

      </div>
    </div>
  </div>
  );
}
