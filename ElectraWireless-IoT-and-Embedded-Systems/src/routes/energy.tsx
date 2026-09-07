import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, TriangleAlert, Check, Activity, Cpu, Zap } from "lucide-react";
import { SciFiCard } from "@/components/ui/sci-fi-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnergyAreaChart, EnergyBarChart } from "@/components/home/EnergyChart";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <SciFiCard
      color={accent ? "emerald" : "purple"}
      className="p-4"
    >
      <span className={cn("mb-6 inline-flex", accent ? "text-emerald-500" : "text-purple-500")}>
        <Icon className={cn("h-5 w-5")} />
      </span>
      <p className="font-display text-2xl font-extrabold tracking-tight dark:text-white text-slate-900">{value}</p>
      <p className={cn("text-xs", accent ? "text-emerald-600 dark:text-emerald-400" : "text-purple-600 dark:text-purple-300/70")}>{label}</p>
    </SciFiCard>
  );
}

export const Route = createFileRoute("/energy")({
  head: () => ({
    meta: [
      { title: "Energy Intelligence, ElectraWireless" },
      {
        name: "description",
        content: "Track, rank and optimize device-level and whole-home energy use.",
      },
    ],
  }),
  component: EnergyPage,
});

const ranges = {
  daily: Array.from({ length: 24 }, (_, i) => ({
    label: `${i}`,
    value: Math.round(400 + Math.sin(i / 3) * 350 + Math.random() * 200),
  })),
  weekly: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({
    label: d,
    value: Math.round(8 + Math.random() * 6),
  })),
  monthly: Array.from({ length: 4 }, (_, i) => ({
    label: `W${i + 1}`,
    value: Math.round(50 + Math.random() * 30),
  })),
};

function EnergyPage() {
  const { state, dispatch, totalWatts, activeCount, alerts } = useHome();
  const [range, setRange] = useState<keyof typeof ranges>("daily");
  const [appliedIds, setAppliedIds] = useState<string[]>([]);

  const ranking = [...state.devices]
    .filter((d) => d.on)
    .sort((a, b) => b.watts - a.watts)
    .slice(0, 8)
    .map((d) => ({ label: d.name, value: d.watts }));

  const findDevice = (match: string) =>
    state.devices.find((d) => d.name.toLowerCase().includes(match));

  const optimizations = [
    {
      id: "workstation",
      text: "Shift Workstation Plug load away from the 2 to 4 PM peak",
      apply: () => {
        const d = findDevice("workstation");
        if (d) dispatch({ type: "UPDATE_DEVICE", id: d.id, patch: { on: false } });
      },
    },
    {
      id: "living-ac",
      text: "Raise Living AC setpoint by 1°C to save ~110 W",
      apply: () => {
        const d = findDevice("living ac");
        if (d)
          dispatch({
            type: "UPDATE_DEVICE",
            id: d.id,
            patch: { temperature: (d.temperature ?? 24) + 1 },
          });
      },
    },
    {
      id: "coffee",
      text: "Schedule Coffee Maker outside peak tariff hours",
      apply: () => {
        const d = findDevice("coffee");
        if (d) dispatch({ type: "UPDATE_DEVICE", id: d.id, patch: { on: false } });
      },
    },
  ];

  const applyOptimization = (o: (typeof optimizations)[number]) => {
    o.apply();
    setAppliedIds((ids) => [...ids, o.id]);
    toast.success("Optimization applied");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Energy</h1>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Cpu, label: "Devices connected", value: String(state.devices.length) },
          { icon: Activity, label: "Active now", value: String(activeCount), accent: true },
          { icon: Zap, label: "Live consumption", value: `${(totalWatts / 1000).toFixed(2)} kW` },
          { icon: TriangleAlert, label: "Alerts", value: String(alerts.length) },
        ].map((s) => (
          <div key={s.label}>
            <StatCard icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
          </div>
        ))}
      </div>

      <SciFiCard color="violet" className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">Consumption</h2>
          <Tabs value={range} onValueChange={(v) => setRange(v as keyof typeof ranges)}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <EnergyAreaChart data={ranges[range]} height={240} />
      </SciFiCard>

      <SciFiCard color="orange" className="p-4">
        <div className="flex items-center gap-3">
          <TriangleAlert className="h-5 w-5 text-orange-500" />
          <p className="text-sm text-slate-800 dark:text-orange-200">
            <span className="font-semibold text-orange-600 dark:text-orange-400">Abnormal spike detected</span> around 2–4 PM, 38% above
            your daily average.
          </p>
        </div>
      </SciFiCard>

      <div className="grid gap-4">
        <SciFiCard color="purple" className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-foreground">
            <TrendingUp className="h-4 w-4" /> Top consumers
          </h2>
          <EnergyBarChart data={ranking} />
        </SciFiCard>

        <SciFiCard color="fuchsia" className="space-y-3 p-5">
          <h2 className="font-bold text-foreground">Suggested optimizations</h2>
          {optimizations.filter((o) => !appliedIds.includes(o.id)).length === 0 && (
            <p className="text-sm text-fuchsia-600 dark:text-fuchsia-300">All optimizations applied. Nice work.</p>
          )}
          {optimizations
            .filter((o) => !appliedIds.includes(o.id))
            .map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-[1rem] border border-fuchsia-200 dark:border-fuchsia-500/20 bg-white/40 dark:bg-fuchsia-950/20 p-3 text-sm text-slate-800 dark:text-fuchsia-200 shadow-sm"
              >
                <span>{o.text}</span>
                <Button size="sm" variant="outline" onClick={() => applyOptimization(o)} className="dark:border-fuchsia-500/30 dark:hover:bg-fuchsia-900/50">
                  <Check className="mr-1 h-3.5 w-3.5" /> Apply
                </Button>
              </div>
            ))}
        </SciFiCard>
      </div>
    </div>
  );
}
