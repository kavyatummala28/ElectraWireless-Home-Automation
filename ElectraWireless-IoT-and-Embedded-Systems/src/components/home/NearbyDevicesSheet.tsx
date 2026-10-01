import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tv, Speaker, Cpu, RefreshCw, ChevronRight, Loader2, Check, Wifi, ArrowLeft, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { scanNearbyDevices, type NearbyDevice } from "@/lib/tv/discovery";
import { connectPanasonic, requestPanasonicPin, submitPanasonicPin } from "@/lib/panasonic";
import { connectLGTV } from "@/lib/lg-tv";
import { connectAndroidTv, submitAndroidTvCode } from "@/lib/androidtv";

const BRAND_LABEL: Record<string, string> = {
  panasonic: "Panasonic", lg: "LG", samsung: "Samsung", sony: "Sony",
  philips: "Philips", google: "Google / Android TV", xiaomi: "Xiaomi Mi",
  tcl: "TCL", hisense: "Hisense", roku: "Roku", amazon: "Fire TV",
  vizio: "Vizio", oneplus: "OnePlus", toshiba: "Toshiba", sharp: "Sharp",
  vu: "Vu", realme: "realme", other: "Smart TV",
};

// Accent colour per brand (icon tile)
const BRAND_COLOR: Record<string, string> = {
  panasonic: "from-sky-500 to-blue-600",
  lg: "from-rose-500 to-pink-600",
  samsung: "from-indigo-500 to-blue-700",
  sony: "from-zinc-500 to-zinc-700",
  google: "from-emerald-500 to-teal-600",
  xiaomi: "from-orange-500 to-amber-600",
};

type Step = "list" | "confirm" | "connecting" | "pin" | "done";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (device: NearbyDevice) => void;
}

export function NearbyDevicesSheet({ open, onOpenChange, onConnected }: Props) {
  const [devices, setDevices] = useState<NearbyDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<NearbyDevice | null>(null);
  const [step, setStep] = useState<Step>("list");
  const [status, setStatus] = useState("");
  const [pin, setPin] = useState("");
  const scanId = useRef(0);
  // Panasonic VIERA shows a 4-digit PIN; Android TV shows a 6-character code
  const isAtv = selected?.protocol === "androidtv";
  const codeLength = isAtv ? 6 : 4;

  const scan = async () => {
    const id = ++scanId.current;
    setDevices([]);
    setScanning(true);
    const add = (d: NearbyDevice) =>
      id === scanId.current && setDevices((prev) => (prev.some((p) => p.ip === d.ip) ? prev : [...prev, d]));
    const all = await scanNearbyDevices(add);
    if (id !== scanId.current) return;
    setDevices(all);
    setScanning(false);
  };

  useEffect(() => {
    if (open) {
      setStep("list");
      setSelected(null);
      scan();
    } else {
      scanId.current++;
    }
  }, [open]);

  const finish = (d: NearbyDevice) => {
    setStep("done");
    setTimeout(() => {
      onConnected(d);
      onOpenChange(false);
    }, 1100);
  };

  const connect = async () => {
    if (!selected) return;
    setStep("connecting");
    try {
      if (selected.protocol === "androidtv") {
        setStatus("Talking to your TV…");
        const result = await connectAndroidTv(selected.ip);
        if (result === "code_required") {
          setPin("");
          setStep("pin");
          return;
        }
        finish(selected);
      } else if (selected.brand === "panasonic") {
        setStatus("Talking to your TV…");
        const result = await connectPanasonic(selected.ip);
        if (result === "unreachable") throw new Error("Can't reach the TV. Is it switched on?");
        if (result === "pin_required") {
          setStatus("Asking the TV for a PIN…");
          await requestPanasonicPin(selected.ip);
          setPin("");
          setStep("pin");
          return;
        }
        finish(selected);
      } else if (selected.brand === "lg") {
        setStatus("Press Allow on your TV screen");
        const ok = await connectLGTV(selected.ip);
        if (!ok) throw new Error("The LG TV didn't accept the connection");
        finish(selected);
      } else if (selected.brand === "samsung") {
        // Samsung asks "Allow?" on the TV at the first button press
        finish(selected);
      }
    } catch (e: any) {
      toast.error(e?.message || "Couldn't connect");
      setStep("confirm");
    }
  };

  const sendPin = async (code: string) => {
    if (!selected || code.length !== codeLength) return;
    setStep("connecting");
    setStatus("Checking code…");
    try {
      if (isAtv) await submitAndroidTvCode(selected.ip, code);
      else await submitPanasonicPin(selected.ip, code);
      finish(selected);
    } catch (e: any) {
      toast.error(e?.message || "Wrong PIN");
      setStep("confirm");
    }
  };

  const tvs = devices.filter((d) => d.kind === "tv");
  const others = devices.filter((d) => d.kind !== "tv");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] border-white/10 bg-background/80 backdrop-blur-2xl">
        {/* soft glow behind the sheet content */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/20 to-transparent" />

        <AnimatePresence mode="wait">
          {step === "list" ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="relative flex flex-col overflow-hidden"
            >
              {/* Header with radar */}
              <div className="flex items-center gap-4 px-5 pt-4 pb-3">
                <Radar active={scanning} />
                <div className="flex-1 min-w-0">
                  <DrawerTitle className="text-lg font-bold">Nearby devices</DrawerTitle>
                  <DrawerDescription className="text-xs">
                    {scanning
                      ? "Scanning your Wi-Fi…"
                      : devices.length
                        ? `${tvs.length} TV${tvs.length === 1 ? "" : "s"}${others.length ? `, ${others.length} other` : ""} found`
                        : "Nothing found yet"}
                  </DrawerDescription>
                </div>
                <button
                  onClick={scan}
                  disabled={scanning}
                  className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-md transition active:scale-90 disabled:opacity-40"
                  aria-label="Scan again"
                >
                  <RefreshCw className={cn("w-4 h-4", scanning && "animate-spin")} />
                </button>
              </div>

              <div className="px-4 pb-8 overflow-y-auto space-y-5">
                {tvs.length > 0 && (
                  <Section title="TVs">
                    {tvs.map((d, i) => (
                      <DeviceRow key={d.ip} d={d} index={i} onClick={() => { setSelected(d); setStep("confirm"); }} />
                    ))}
                  </Section>
                )}

                {others.length > 0 && (
                  <Section title="Other devices">
                    {others.map((d, i) => (
                      <DeviceRow key={d.ip} d={d} index={i} onClick={() => {}} />
                    ))}
                  </Section>
                )}

                {scanning && devices.length === 0 && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-[68px] rounded-2xl border border-white/5 bg-white/[0.04] animate-pulse" />
                    ))}
                  </div>
                )}

                {!scanning && devices.length === 0 && <EmptyState />}
              </div>
            </motion.div>
          ) : selected && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="relative px-6 pt-3 pb-10 flex flex-col items-center text-center"
            >
              <DrawerTitle className="sr-only">Connect to {selected.name}</DrawerTitle>
              <DrawerDescription className="sr-only">Pair this TV with the app</DrawerDescription>

              <div className="self-stretch flex h-9">
                {(step === "confirm" || step === "pin") && (
                  <button
                    onClick={() => setStep("list")}
                    className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center active:scale-90 transition"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* TV illustration */}
              <div className="relative my-4">
                <div aria-hidden className="absolute inset-0 -m-6 rounded-full bg-primary/30 blur-3xl" />
                <div className="relative">
                  <div className="w-40 h-24 rounded-xl border-2 border-white/20 bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6)]">
                    <AnimatePresence mode="wait">
                      {step === "done" ? (
                        <motion.div key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.6)]">
                          <Check className="w-6 h-6 text-white" strokeWidth={3} />
                        </motion.div>
                      ) : step === "connecting" ? (
                        <motion.div key="conn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <motion.span key={i} className="w-2 h-2 rounded-full bg-primary"
                              animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                          ))}
                        </motion.div>
                      ) : step === "pin" ? (
                        <motion.div key="pin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Lock className="w-7 h-7 text-primary" />
                        </motion.div>
                      ) : (
                        <motion.div key="tv" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Tv className="w-8 h-8 text-foreground/70" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="mx-auto w-14 h-2 rounded-b-lg bg-white/15" />
                </div>
              </div>

              <h3 className="text-xl font-bold">
                {step === "done" ? "You're connected" : step === "pin" ? (isAtv ? "Enter the code" : "Enter the PIN") : `Connect to ${BRAND_LABEL[selected.brand]} TV`}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
                {step === "done"
                  ? `${selected.name} is ready to control`
                  : step === "pin"
                    ? `A ${codeLength}-character code is showing on your TV screen`
                    : step === "connecting"
                      ? status
                      : selected.name + (selected.model ? ` · ${selected.model}` : "")}
              </p>

              {step === "confirm" && (
                <button
                  onClick={connect}
                  className="mt-7 w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-[#7C3AED] text-white font-bold shadow-[0_10px_30px_-8px_rgba(124,58,237,0.7)] active:scale-[0.98] transition"
                >
                  Connect
                </button>
              )}

              {step === "connecting" && (
                <div className="mt-7 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> This can take a few seconds
                </div>
              )}

              {step === "pin" && (
                <div className="mt-6 w-full flex flex-col items-center gap-4">
                  <InputOTP
                    maxLength={codeLength}
                    value={pin}
                    onChange={(v) => setPin(v.toUpperCase())}
                    onComplete={sendPin}
                    inputMode={isAtv ? "text" : "numeric"}
                    autoFocus
                  >
                    <InputOTPGroup className={isAtv ? "gap-2" : "gap-3"}>
                      {Array.from({ length: codeLength }, (_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className={cn(
                            "text-2xl font-bold rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md first:rounded-l-2xl last:rounded-r-2xl",
                            isAtv ? "w-11 h-14" : "w-14 h-16",
                          )}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <button
                    onClick={async () => {
                      try {
                        if (isAtv) {
                          await connectAndroidTv(selected.ip);
                          toast("Asked the TV for a new code");
                        } else {
                          await requestPanasonicPin(selected.ip);
                          toast("New PIN sent to the TV");
                        }
                      } catch (e: any) { toast.error(e?.message); }
                    }}
                    className="text-xs text-muted-foreground underline underline-offset-4"
                  >
                    No code on the TV? Show it again
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
}

/* ----------------------------- pieces ----------------------------- */

function Radar({ active }: { active: boolean }) {
  return (
    <div className="relative w-12 h-12 shrink-0">
      {active && [0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-primary/60"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.66, ease: "easeOut" }}
        />
      ))}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-[#7C3AED] flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
        <Wifi className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-1 mb-2 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DeviceRow({ d, index, onClick }: { d: NearbyDevice; index: number; onClick: () => void }) {
  const Icon = d.kind === "tv" ? Tv : d.kind === "speaker" ? Speaker : Cpu;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      disabled={!d.supported}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl border text-left backdrop-blur-md transition",
        d.supported
          ? "border-white/10 bg-white/[0.06] hover:bg-white/[0.10] active:scale-[0.98]"
          : "border-white/5 bg-white/[0.02]",
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br",
          d.supported ? BRAND_COLOR[d.brand] ?? "from-primary to-[#7C3AED]" : "from-zinc-700 to-zinc-800",
        )}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm truncate", !d.supported && "text-foreground/60")}>{d.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {d.kind === "tv" || d.brand !== "other" ? BRAND_LABEL[d.brand] : "Device"}{d.model ? ` · ${d.model}` : ""}
        </p>
      </div>
      {d.supported ? (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          Ready
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
        </span>
      ) : (
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/5 text-muted-foreground">Coming soon</span>
      )}
    </motion.button>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-6 px-2">
      <div className="mx-auto w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center mb-3">
        <Wifi className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="font-semibold">No devices found</p>
      <p className="text-sm text-muted-foreground mt-1">Check these and scan again:</p>
      <ul className="mt-3 space-y-2 text-left text-sm">
        {[
          "TV is switched on",
          "TV and this device are on the same Wi-Fi",
          "TV's remote / network control setting is on",
        ].map((t) => (
          <li key={t} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}