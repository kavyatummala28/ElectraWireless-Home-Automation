import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AtSign, UserRound, ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      setError(login(username, name));
      setBusy(false);
    }, 500);
  };

  return (
    <div className="relative flex h-[100dvh] w-full justify-center overflow-hidden bg-secondary/50">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-background ring-1 ring-border/60">
        {/* Ambient glow blobs (same palette as the app) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div aria-hidden className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-[90px]" />
          <div aria-hidden className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-[#7C3AED]/30 blur-[100px]" />
          <div aria-hidden className="absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-[#C084FC]/20 blur-[110px]" />
          {/* faint grid for a techy feel */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
              backgroundSize: "36px 36px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-6">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center mb-8"
          >
            <div className="relative mb-5">
              <div aria-hidden className="absolute inset-0 -m-4 rounded-full bg-primary/40 blur-2xl" />
              <div className="relative rounded-[1.75rem] border border-white/15 bg-white/10 p-3 backdrop-blur-xl shadow-[0_8px_32px_rgba(124,58,237,0.35)]">
                <Logo className="w-14 h-14" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">ElectraWireless</h1>
           
          </motion.div>

          {/* Glass card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="rounded-[2rem] border border-white/15 bg-white/[0.06] p-6 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(124,58,237,0.45)]"
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          >
            

            <div className="space-y-4">
              <Field
                label="Username"
                icon={<AtSign className="w-4 h-4" />}
                value={username}
                onChange={(v) => { setUsername(v); setError(null); }}
                placeholder="Username"
                autoCapitalize="none"
                autoComplete="username"
                invalid={error === "Wrong username"}
              />
              <Field
                label="Enter your name"
                icon={<UserRound className="w-4 h-4" />}
                value={name}
                onChange={(v) => { setName(v); setError(null); }}
                placeholder="e.g. Kavya"
                autoComplete="name"
                invalid={error === "Enter your name"}
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                  transition={{ duration: 0.35 }}
                  className="text-sm font-medium text-destructive"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={submit}
                disabled={busy}
                className="group w-full mt-1 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-[#7C3AED] text-white font-bold shadow-[0_10px_30px_-8px_rgba(124,58,237,0.7)] active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-80"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  autoCapitalize?: string;
  invalid?: boolean;
}

function Field({ label, icon, value, onChange, placeholder, autoComplete, autoCapitalize, invalid }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-white/[0.07] px-4 backdrop-blur-md transition",
          "focus-within:border-primary/60 focus-within:bg-white/[0.10] focus-within:shadow-[0_0_0_4px_rgba(167,139,250,0.15)]",
          invalid ? "border-destructive/60" : "border-white/15",
        )}
      >
        <span className="text-muted-foreground">{icon}</span>
        <input
          className="w-full bg-transparent py-3.5 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
        />
      </div>
    </label>
  );
}