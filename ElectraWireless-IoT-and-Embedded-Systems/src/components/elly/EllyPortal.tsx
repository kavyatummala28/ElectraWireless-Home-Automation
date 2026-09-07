import { useEffect, useRef, useState } from "react";
import { Mic, CornerDownLeft, X, Volume2, VolumeX, Loader2, Cpu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHome } from "@/lib/home/store";
import { handleLocalChat, initWebLLMEngine } from "@/lib/home/bot";
import { EllyLogo } from "./EllyLogo";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

const chips = [
  "Turn off all lights",
  "Set bedroom AC to 23 degrees",
  "Activate energy saver mode",
  "Activate night mode",
];

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

// Minimal typing for the Web Speech API (not in standard TS lib)
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const uid = () => Math.random().toString(36).slice(2);

const GREETING: ChatMsg = {
  id: "greet",
  role: "assistant",
  content:
    "Hi, I'm ELLY. Ask me anything or tell me what to do, like turning off the lights or setting the AC.",
};

export function EllyPortal({ open, onClose, initialCmd }: { open: boolean; onClose: () => void; initialCmd?: string }) {
  const { runVoiceCommand, state, totalWatts, activeCount, dispatch } = useHome();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [heard, setHeard] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [mlcProgress, setMlcProgress] = useState("");
  const [mlcReady, setMlcReady] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize WebLLM engine
  useEffect(() => {
    let isMounted = true;
    initWebLLMEngine((progress: any) => {
      if (isMounted) setMlcProgress(progress.text);
    }).then(() => {
      if (isMounted) {
        setMlcReady(true);
        setMlcProgress("");
      }
    }).catch(err => {
      console.error("WebLLM initialization failed:", err);
      if (isMounted) setMlcProgress("Failed to load local AI model.");
    });
    return () => { isMounted = false; };
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Process initial command if woken with one
  useEffect(() => {
    if (open && initialCmd) {
      // Small delay to let UI render before sending
      setTimeout(() => sendMessage(initialCmd), 500);
    } else if (open && !initialCmd && !listening) {
      // If opened with just "Hey Elly", start listening automatically
      startListening();
    }
  }, [open, initialCmd]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, mlcProgress]);

  // Keep input focused
  useEffect(() => {
    if (open && !listening) inputRef.current?.focus();
  }, [open, listening, messages]);

  const speak = async (s: string) => {
    if (!voiceReplies) return;
    try {
      if (typeof window !== "undefined" && (window as any).cordova) {
        await TextToSpeech.stop();
        await TextToSpeech.speak({
          text: s,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
      } else if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(s);
        const voices = window.speechSynthesis.getVoices();
        const female = voices.find(v => /female|woman|zira|samantha|karen|victoria/i.test(v.name)) || voices.find(v => v.lang.startsWith("en"));
        if (female) u.voice = female;
        u.rate = 1.02;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
      }
    } catch {
      /* ignore */
    }
  };

  const sendMessage = async (raw: string) => {
    const value = raw.trim();
    if (!value || thinking) return;
    setText("");
    setHeard("");
    const userMsg: ChatMsg = { id: uid(), role: "user", content: value };
    const history = [...messages, userMsg];
    setMessages(history);
    setThinking(true);

    try {
      // Small artificial delay to feel like it's thinking
      await new Promise(resolve => setTimeout(resolve, 600));

      const apiUrl = (import.meta.env.VITE_API_URL || "") + "/api/chat";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: history, 
          homeSummary: `${activeCount} devices on, total load ${(totalWatts / 1000).toFixed(2)} kW. Active: ${state.devices.filter((d) => d.on).map((d) => d.name).slice(0, 8).join(", ") || "none"}. Role: ${state.role}.` 
        })
      });

      if (!response.ok) throw new Error("API failed");

      const data = await response.json();
      const reply = data.reply || "Done.";
      
      if (data.command) {
        runVoiceCommand(data.command, { silent: true });
      }

      setMessages((m) => [...m, { id: uid(), role: "assistant", content: reply }]);
      speak(reply);
    } catch (e) {
      // Fallback to local regex bot if API fails
      try {
        const res = await handleLocalChat(value, state, dispatch, runVoiceCommand);
        const reply = res.reply || "I couldn't process that locally.";
        setMessages((m) => [...m, { id: uid(), role: "assistant", content: reply }]);
        speak(reply);
      } catch {
        const msg = "Sorry, I had trouble processing that.";
        setMessages((m) => [...m, { id: uid(), role: "assistant", content: msg }]);
        speak(msg);
      }
    } finally {
      setThinking(false);
    }
  };

  const startListening = async () => {
    setHeard("");
    setListening(true);
    try {
      if (typeof window !== "undefined" && (window as any).cordova) {
        let hasPermission = { speechRecognition: 'prompt' };
        try {
          hasPermission = await SpeechRecognition.checkPermissions();
        } catch (e) {
          console.warn("Permission check error in Portal:", e);
        }

        if (hasPermission.speechRecognition !== 'granted') {
          try {
            hasPermission = await SpeechRecognition.requestPermissions();
          } catch (e) {
            console.warn("Permission request error in Portal:", e);
          }
        }
        
        if (hasPermission.speechRecognition !== 'granted') {
          setListening(false);
          return;
        }
        
        const result = await SpeechRecognition.start({
          language: 'en-US',
          maxResults: 1,
          prompt: 'Listening...',
          partialResults: true,
          popup: true,
        });
        
        setListening(false);
        if (result.matches && result.matches.length > 0) {
          const transcript = result.matches[0];
          setHeard(transcript);
          sendMessage(transcript);
        }
      } else {
        // Fallback for web preview
        const w = window as any;
        const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!Ctor) return;
        const rec = new Ctor();
        rec.lang = "en-US";
        rec.continuous = false;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
          const transcript = Array.from({ length: e.results.length })
            .map((_, i) => e.results[i][0].transcript)
            .join(" ");
          setHeard(transcript);
        };
        rec.onend = () => {
          setListening(false);
          setHeard((current) => {
            if (current.trim()) sendMessage(current.trim());
            return "";
          });
        };
        rec.onerror = () => setListening(false);
        recognitionRef.current = rec;
        rec.start();
      }
    } catch (e) {
      setListening(false);
    }
  };

  const stopListening = () => {
    setListening(false);
    try {
      if (typeof window !== "undefined" && (window as any).cordova) {
        SpeechRecognition.stop();
      } else {
        recognitionRef.current?.stop();
      }
    } catch {
      /* ignore */
    }
  };

  const toggleMic = () => {
    if (listening) {
      stopListening();
      if (heard.trim()) sendMessage(heard.trim());
    } else {
      startListening();
    }
  };

  // Reset transient state when closing
  useEffect(() => {
    if (!open) {
      stopListening();
      setHeard("");
      setText("");
      setThinking(false);
      try {
        if (typeof window !== "undefined" && (window as any).cordova) {
          TextToSpeech.stop();
        } else if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex w-full max-w-md flex-col bg-background text-foreground">
      {/* Ambient purple glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15"
      />

      {/* Header */}
      <div className="relative flex items-center gap-3 px-5 pt-6">
        <EllyLogo className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold leading-none">ELLY</p>
          <p className="text-[11px] text-muted-foreground">AI Control Portal</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVoiceReplies((v) => !v)}
          aria-label={voiceReplies ? "Mute voice replies" : "Unmute voice replies"}
          className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {voiceReplies ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close ELLY portal"
          className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="relative flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.map((m) =>
          m.role === "assistant" ? (
            <div key={m.id} className="flex items-start gap-2.5">
              <EllyLogo className="mt-0.5 h-7 w-7 shrink-0" />
              <p className="max-w-[85%] text-sm leading-relaxed text-foreground">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-[1.5rem] rounded-br-sm bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground">
                {m.content}
              </p>
            </div>
          ),
        )}
        {thinking && (
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <EllyLogo className="h-7 w-7 shrink-0" />
            <span className="flex items-center gap-1.5 text-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> ELLY is thinking
            </span>
          </div>
        )}
        {mlcProgress && (
          <div className="flex flex-col gap-1 rounded-[1rem] border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
            <div className="flex items-center gap-2 font-medium">
              <Cpu size={14} />
              <span>Initializing In-Browser AI Engine...</span>
            </div>
            <span className="opacity-80 break-words">{mlcProgress}</span>
          </div>
        )}
        {listening && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-[1.5rem] rounded-br-sm bg-muted px-3.5 py-2 text-sm italic text-muted-foreground">
              {heard || "Listening…"}
            </p>
          </div>
        )}
      </div>

      {/* Bottom: composer */}
      <div className="relative border-t border-border/60 bg-background/95 backdrop-blur-md px-4 pb-6 pt-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => sendMessage(c)}
              disabled={thinking}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(text);
          }}
          className="flex items-center gap-2"
        >
          <Button
            type="button"
            size="icon"
            onClick={toggleMic}
            aria-label={listening ? "Stop listening" : "Start voice command"}
            className={cn(
              "shrink-0 rounded-full transition-colors",
              listening
                ? "bg-primary text-primary-foreground shadow-[0_0_24px_-4px_hsl(var(--primary))]"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <Mic className={cn("h-4 w-4", listening && "animate-pulse")} />
          </Button>
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Ask ELLY… e.g. "Set bedroom AC to 23 degrees"'}
            className="flex-1 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          <Button
            type="submit"
            size="icon"
            disabled={thinking || !text.trim()}
            aria-label="Send command"
            className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
