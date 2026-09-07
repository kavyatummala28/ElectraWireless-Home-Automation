import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Power, Moon, ShieldCheck, Zap, OctagonAlert,
  Cpu, DoorOpen, Mic, Loader2, Wifi, Activity
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";
import { handleLocalChat } from "@/lib/home/bot";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ELLY Home Dashboard · ElectraWireless" },
      { name: "description", content: "Control, monitor, and optimize your smart home with ELLY." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, dispatch, totalWatts, runVoiceCommand, canEdit } = useHome();
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState("Tap the core to speak");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const speak = async (s: string, emotion?: string) => {
    setIsSpeaking(true);
    let pitch = 1.0, rate = 1.0;
    if (emotion === "happy") { pitch = 1.2; rate = 1.1; }
    else if (emotion === "sad") { pitch = 0.8; rate = 0.9; }
    else if (emotion === "urgent") { pitch = 1.1; rate = 1.3; }
    else if (emotion === "calm") { pitch = 0.9; rate = 0.85; }
    try {
      if (typeof window !== "undefined" && (window as any).cordova) {
        await TextToSpeech.stop();
        await TextToSpeech.speak({ text: s, lang: "en-US", rate, pitch, volume: 1.0, category: "ambient" });
      } else if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(s);
        const voices = window.speechSynthesis.getVoices();
        const female = voices.find(v => /female|woman|zira|samantha|karen|victoria/i.test(v.name)) || voices.find(v => v.lang.startsWith("en"));
        if (female) u.voice = female;
        u.pitch = pitch; u.rate = rate;
        u.onend = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(u);
        return;
      }
    } catch { /* ignore */ }
    setTimeout(() => setIsSpeaking(false), s.length * 70);
  };

  const processVoice = async (text: string) => {
    if (!text.trim()) return;
    setIsListening(false);
    setIsThinking(true);
    setTranscript(`"${text}"`);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || "") + "/api/chat";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [{ role: "user", content: text }], 
          homeSummary: `${state.devices.filter(d => d.on).length} devices on. Role: ${state.role}.` 
        })
      });
      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      
      setIsThinking(false);
      const reply = data.reply || "Done.";
      setTranscript(reply);
      speak(reply);
      if (data.command) runVoiceCommand(data.command, { silent: true });
    } catch {
      // Fallback
      try {
        const res = await handleLocalChat(text, state, dispatch, runVoiceCommand) as any;
        setIsThinking(false);
        setTranscript(res.reply);
        speak(res.reply, res.emotion);
        if (res.navigateTo) navigate({ to: res.navigateTo });
      } catch {
        setIsThinking(false);
        setTranscript("Error processing request");
      }
    }
  };

  const toggleMic = async () => {
    if (isListening) {
      setIsListening(false);
      try {
        if ((window as any).cordova) SpeechRecognition.stop();
        else recognitionRef.current?.stop();
      } catch { }
      return;
    }
    try {
      if ((window as any).cordova) TextToSpeech.stop();
      else window.speechSynthesis?.cancel();
    } catch { }
    setIsSpeaking(false);
    setTranscript("Listening...");
    setIsListening(true);
    try {
      if (typeof window !== "undefined" && (window as any).cordova) {
        const hasPermission = await SpeechRecognition.checkPermissions();
        if (hasPermission.speechRecognition !== "granted") await SpeechRecognition.requestPermissions();
        const result = await SpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: false });
        setIsListening(false);
        if (result.matches && result.matches.length > 0) processVoice(result.matches[0]);
      } else {
        const w = window as any;
        const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!Ctor) { toast.error("Speech recognition not supported."); setIsListening(false); return; }
        const rec = new Ctor();
        rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
        rec.onresult = (e: any) => processVoice(e.results[0][0].transcript);
        rec.onend = () => setIsListening(false);
        rec.onerror = () => setIsListening(false);
        recognitionRef.current = rec;
        rec.start();
      }
    } catch { setIsListening(false); }
  };

  const onDevices = state.devices.filter(d => d.on).length;
  const totalDevices = state.devices.length;

  return (
    <div className="flex flex-col min-h-full gap-5 pb-4 relative">
      {/* Ambient Purple Glow Orbs */}
      <div className="pointer-events-none fixed top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-purple-600/20 blur-[100px]" />
        <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-violet-500/15 blur-[80px]" />
        <div className="absolute bottom-20 left-1/4 w-48 h-48 rounded-full bg-fuchsia-600/10 blur-[70px]" />
      </div>

      {/* Status Cards Row */}
      <div className="relative z-10 grid grid-cols-2 gap-3">
        <div className="glass-card rounded-[2rem] p-5 relative overflow-hidden shadow-sm flex flex-col justify-center">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase mb-2">System Time</p>
          <p className="text-3xl font-extrabold text-foreground tabular-nums leading-none tracking-tight">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">
            {time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="glass-card rounded-[2rem] p-5 relative overflow-hidden shadow-sm flex flex-col justify-center">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase mb-2">Grid Load</p>
          <p className="text-3xl font-extrabold text-foreground leading-none tracking-tight">
            {(totalWatts / 1000).toFixed(2)}<span className="text-base text-muted-foreground font-medium ml-1">kW</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">{onDevices} of {totalDevices} on</p>
          <svg className="absolute bottom-0 left-0 w-full h-12 text-primary opacity-20 pointer-events-none" viewBox="0 0 100 30" preserveAspectRatio="none">
            <path d="M0,30 Q20,10 40,20 T80,10 T100,25 L100,30 L0,30 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Status Pill Row */}
      <div className="relative z-10 flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-[1rem] glass-card px-3 py-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 truncate">Online</span>
        </div>
        <div className="flex-1 flex items-center gap-2 rounded-[1rem] glass-card px-3 py-2 shadow-sm">
          <Wifi className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[11px] font-medium text-primary truncate">{onDevices} Active</span>
        </div>
        <div className="flex-1 flex items-center gap-2 rounded-[1rem] glass-card px-3 py-2 shadow-sm">
          <Activity className="h-3 w-3 text-secondary-foreground shrink-0" />
          <span className="text-[11px] font-medium text-secondary-foreground truncate">60+ Protocols</span>
        </div>
      </div>

      {/* ELLY AI Core Orb */}
      <div className="relative z-10 flex flex-col items-center py-6">
        <button
          onClick={toggleMic}
          className="relative flex items-center justify-center w-48 h-48 outline-none group"
          aria-label="Tap to speak to ELLY"
        >
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-700 blur-[20px]",
            isListening ? "bg-primary/40 scale-125 animate-ping" :
            isSpeaking ? "bg-chart-3/30 scale-150 animate-pulse" :
            "bg-primary/20 group-hover:bg-primary/30 group-hover:scale-110"
          )} />
          <div className={cn(
            "relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl",
            isListening
              ? "bg-gradient-to-br from-primary to-chart-3 shadow-[0_0_80px_rgba(var(--primary),0.8)] scale-95"
              : isSpeaking
              ? "bg-gradient-to-br from-chart-3 to-primary shadow-[0_0_90px_rgba(var(--chart-3),0.8)] scale-110 animate-pulse"
              : "bg-gradient-to-br from-primary via-chart-3 to-primary bg-[length:200%_200%] animate-[gradient_4s_ease_infinite] shadow-[0_0_60px_rgba(var(--primary),0.4)] group-hover:shadow-[0_0_80px_rgba(var(--primary),0.6)]"
          )}>
            {isListening ? (
              <Mic className="h-10 w-10 text-white animate-pulse" />
            ) : isThinking ? (
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner">
                <div className="w-8 h-8 rounded-full bg-white/80 mix-blend-overlay animate-pulse" />
              </div>
            )}
          </div>
        </button>
        <p className={cn(
          "mt-6 text-center text-sm font-medium transition-all duration-300",
          isListening || isSpeaking ? "text-primary" : "text-muted-foreground"
        )}>
          {transcript}
        </p>
      </div>

      {/* Subroutines */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-primary/20 dark:from-primary/50 to-transparent" />
          <p className="text-primary font-mono text-[10px] tracking-[0.25em] uppercase px-2">Subroutines</p>
          <div className="h-px flex-1 bg-gradient-to-l from-primary/20 dark:from-primary/50 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <EllyBtn icon={Power} label="All Off" sublabel="Power Down"
            onClick={() => { dispatch({ type: "ALL_OFF" }); toast.success("Powering down all devices."); }}
            disabled={!canEdit} color="purple" />
          <EllyBtn icon={Moon} label="Night Mode" sublabel="Sleep Routine"
            onClick={() => { dispatch({ type: "NIGHT_MODE" }); toast.success("Night mode activated."); }}
            disabled={!canEdit} color="violet" />
          <EllyBtn icon={ShieldCheck} label="Away Mode" sublabel="Security On"
            onClick={() => { dispatch({ type: "AWAY_MODE" }); toast.success("Away mode armed."); }}
            disabled={!canEdit} color="emerald" />
          <EllyBtn icon={Zap} label="Party Mode" sublabel="Ambience"
            onClick={() => { toast.success("Party mode initiated! 🎉"); }}
            disabled={!canEdit} color="fuchsia" />
          <Link to="/devices" className="block w-full">
            <EllyBtn icon={Cpu} label="Device Matrix" sublabel={`${totalDevices} devices`}
              onClick={() => {}} disabled={false} color="blue" />
          </Link>
          <Link to="/map" className="block w-full">
            <EllyBtn icon={DoorOpen} label="Spatial Layout" sublabel="Floor plan view"
              onClick={() => {}} disabled={false} color="orange" />
          </Link>
          <div className="col-span-2 sm:col-span-1">
            <EmergencyAction
              disabled={!canEdit}
              onConfirm={() => { dispatch({ type: "EMERGENCY" }); toast.error("EMERGENCY LOCKDOWN INITIATED"); }}
            />
          </div>
        </div>
      </div>

      {/* Protocol Badge Strip */}
      <div className="relative z-10 rounded-[1.5rem] glass-card p-4 shadow-sm">
        <p className="text-primary font-mono text-[10px] tracking-[0.2em] uppercase mb-3">Universal Bridge · 60+ Protocols Active</p>
        <div className="flex flex-wrap gap-1.5">
          {["Tuya", "Shelly", "Hue", "ESPHome", "Z-Wave", "Zigbee", "Sonos", "Roku", "LG TV", "Samsung", "IKEA", "Nest", "Ring", "WLED", "Kodi", "+45 more"].map(p => (
            <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-primary/20 text-primary bg-primary/5">
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EllyBtn({ icon: Icon, label, sublabel, onClick, disabled, color, wide }: {
  icon: any; label: string; sublabel?: string; onClick: () => void;
  disabled?: boolean; color: string; wide?: boolean;
}) {
  const colorMap: Record<string, string> = {
    purple:  "border-primary/20 hover:border-primary/50 hover:shadow-[0_0_25px_rgba(var(--primary),0.2)] text-primary",
    violet:  "border-chart-2/20 hover:border-chart-2/50 hover:shadow-[0_0_25px_rgba(var(--chart-2),0.2)] text-chart-2",
    fuchsia: "border-chart-3/20 hover:border-chart-3/50 hover:shadow-[0_0_25px_rgba(var(--chart-3),0.2)] text-chart-3",
    emerald: "border-success/20 hover:border-success/50 hover:shadow-[0_0_25px_rgba(var(--success),0.2)] text-success",
    blue:    "border-chart-4/20 hover:border-chart-4/50 hover:shadow-[0_0_25px_rgba(var(--chart-4),0.2)] text-chart-4",
    orange:  "border-chart-5/20 hover:border-chart-5/50 hover:shadow-[0_0_25px_rgba(var(--chart-5),0.2)] text-chart-5",
    red:     "border-destructive/30 hover:border-destructive/60 hover:shadow-[0_0_25px_rgba(var(--destructive),0.3)] text-destructive bg-destructive/10",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative group rounded-[1.5rem] border glass-card transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed",
        colorMap[color] || colorMap.purple,
        wide ? "w-full flex items-center gap-4 px-5 py-4" : "w-full flex flex-col items-center justify-center gap-2 p-5 h-28"
      )}
    >
      <div className={cn(
        "flex items-center justify-center rounded-[1rem] transition-transform group-hover:scale-110 group-active:scale-95",
        wide ? "w-10 h-10 shrink-0" : "w-11 h-11"
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <div className={cn("text-left", !wide && "text-center")}>
        <p className="font-bold text-xs tracking-wide text-foreground uppercase">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
    </button>
  );
}

function EmergencyAction({ onConfirm, disabled }: { onConfirm: () => void; disabled?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="w-full">
          <EllyBtn icon={OctagonAlert} label="Lockdown" sublabel="Override systems" disabled={disabled} color="red" />
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-card border border-destructive/40 text-foreground max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <OctagonAlert className="h-5 w-5" /> OVERRIDE PROTOCOL
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Execute immediate shutdown of all non-critical power systems? This will isolate the grid and trigger all emergency routines.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-secondary text-secondary-foreground rounded-[1rem]">Abort</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive hover:text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] rounded-[1rem]"
            onClick={onConfirm}
          >
            Execute Lockdown
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
