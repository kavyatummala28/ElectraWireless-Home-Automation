import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/audio-remote")({
  component: AudioRemotePage,
});

function AudioRemotePage() {
  const [audioState, setAudioState] = useState("Playing");
  const [audioVolume, setAudioVolume] = useState([65]);
  const [audioSource, setAudioSource] = useState("Wi-Fi");
  const [bass, setBass] = useState([5]);
  const [treble, setTreble] = useState([5]);

  const handleAction = (msg: string) => toast.success(msg);

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Link to="/remotes" className="p-2 -ml-2 rounded-full bg-white/40 dark:bg-card hover:bg-white/60 dark:bg-secondary/20 transition-colors border border-blue-200 dark:border-border/20">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Home Audio System</h1>
            <p className="text-sm font-medium text-muted-foreground">Sonos Surround • {audioState}</p>
          </div>
        </div>

        <div className="pt-4 flex flex-col items-center gap-8 rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-6 mx-auto max-w-sm shadow-sm">
        
        <div className="flex bg-secondary/50 p-1 rounded-full w-full max-w-[280px]">
          {['Wi-Fi', 'Bluetooth', 'TV Audio'].map(s => (
            <button 
              key={s} 
              onClick={() => { setAudioSource(s); toast.success(`Source switched to ${s}`); }}
              className={cn("flex-1 py-2 text-xs font-semibold rounded-full transition-all", audioSource === s ? "bg-orange-500/20 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]" : "text-neutral-500 hover:text-muted-foreground")}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-8 mt-2">
          <button onClick={() => handleAction('Skip Back')} className="w-12 h-12 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white dark:bg-secondary/10 active:scale-95 transition"><SkipBack className="w-6 h-6 fill-current" /></button>
          <button 
            onClick={() => setAudioState(audioState === 'Playing' ? 'Paused' : 'Playing')} 
            className="w-20 h-20 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center active:scale-95 transition"
          >
            {audioState === 'Playing' ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
          <button onClick={() => handleAction('Skip Forward')} className="w-12 h-12 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white dark:bg-secondary/10 active:scale-95 transition"><SkipForward className="w-6 h-6 fill-current" /></button>
        </div>

        {/* Volume Slider */}
        <div className="w-full space-y-4 max-w-[280px]">
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            <span>{audioVolume[0]}%</span>
          </div>
          <Slider value={audioVolume} min={0} max={100} step={1} onValueChange={setAudioVolume} className="[&>span:first-child]:bg-orange-500/20 [&_[role=slider]]:border-orange-500 [&_[role=slider]]:bg-orange-950 [&>span:first-child>span]:bg-orange-500" />
        </div>

        {/* EQ */}
        <div className="w-full flex gap-6 max-w-[280px] bg-secondary/40 p-4 rounded-[2rem] border border-border/20">
          <div className="flex-1 space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Bass</span><span>{bass[0]}</span></div>
            <Slider value={bass} min={-10} max={10} step={1} onValueChange={setBass} className="[&>span:first-child]:bg-orange-500/20 [&_[role=slider]]:border-orange-500 [&_[role=slider]]:bg-orange-950 [&>span:first-child>span]:bg-orange-500" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Treble</span><span>{treble[0]}</span></div>
            <Slider value={treble} min={-10} max={10} step={1} onValueChange={setTreble} className="[&>span:first-child]:bg-orange-500/20 [&_[role=slider]]:border-orange-500 [&_[role=slider]]:bg-orange-950 [&>span:first-child>span]:bg-orange-500" />
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
