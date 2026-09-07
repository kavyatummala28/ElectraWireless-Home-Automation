import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Thermometer, Gauge, Snowflake, Activity, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { EnergyAreaChart } from "@/components/home/EnergyChart";
import { deviceIcon, deviceTypeLabel } from "@/components/home/device-icons";
import { useState } from "react";
import { openBluetoothSettings, listPairedDevices, type BluetoothDevice } from "@/lib/home/bluetooth";
import { Bluetooth, RefreshCw, Unlink, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useHome } from "@/lib/home/store";
import type { Device } from "@/lib/home/types";

export const Route = createFileRoute("/device/$deviceId")({
  component: DevicePage,
});

function makeSeries(base: number) {
  return Array.from({ length: 12 }, (_, i) => ({
    label: `${i * 2}h`,
    value: Math.max(0, Math.round(base * (0.5 + Math.sin(i / 2) * 0.3 + Math.random() * 0.2))),
  }));
}

function DevicePage() {
  const { deviceId } = Route.useParams();
  const { state, dispatch, canEdit, toggleDevice, toggleActivation } = useHome();
  const router = useRouter();
  const device = state.devices.find((d) => d.id === deviceId);
  const [isLinking, setIsLinking] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);

  const handleRefreshDevices = async () => {
    setIsScanning(true);
    try {
      const devices = await scanBluetoothDevices();
      const paired = await listPairedDevices();
      // combine and deduplicate
      const all = [...paired, ...devices];
      const unique = Array.from(new Map(all.map(item => [item.address, item])).values());
      setPairedDevices(unique);
      setPairedDevices(devices);
      if (devices.length === 0) toast("No paired devices found. Pair in OS settings first.");
    } catch(e) {
      toast.error("Failed to load paired devices.");
    }
    setIsScanning(false);
  };


  if (!device) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-foreground bg-slate-50 dark:bg-black min-h-screen">
        <p>Device not found.</p>
        <Button asChild variant="link">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const room = state.rooms.find((r) => r.id === device.roomId);
  const Icon = deviceIcon[device.type];
  const linked = state.automations.filter((a) => a.enabled);
  const patch = (p: Partial<Device>) =>
    dispatch({ type: "UPDATE_DEVICE", id: device.id, patch: p });

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen text-foreground pb-20 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-8 pt-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.history.back()}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] border border-purple-200 dark:border-purple-500/25 glass-card transition-colors hover:bg-[#181820]"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] border border-purple-200 dark:border-purple-500/25 glass-card">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="flex-1 ml-2">
            <h1 className="text-3xl font-extrabold leading-tight text-foreground tracking-tight">{device.name}</h1>
            <p className="text-[15px] font-medium text-muted-foreground">
              {deviceTypeLabel[device.type]} · {room?.name}
            </p>
          </div>

          {device.type !== "sensor" && (
            <div className="ml-4">
              <Switch
                checked={device.activated ?? false}
                disabled={!canEdit}
                onCheckedChange={() => toggleActivation(device.id)}
                className="data-[state=checked]:bg-[#a855f7] data-[state=checked]:shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-125"
              />
            </div>
          )}
        </div>

        <div className="grid gap-6">
          <div className="space-y-6">
            {/* Controls */}
            <div className="space-y-5 rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-7 shadow-2xl">
              <h2 className="text-lg font-bold text-muted-foreground">Controls</h2>

              {device.type === "light" && (
                <div className="space-y-8 mt-2">
                  <div className="flex justify-between items-center bg-[#181820] p-4 rounded-[1.5rem] border border-border/20">
                    <div className="font-semibold text-foreground">Master Switch</div>
                    <Button 
                      onClick={() => toggleDevice(device.id)}
                      disabled={!canEdit}
                      className={`h-12 px-8 rounded-[1rem] font-bold transition-all ${
                        device.on 
                          ? "bg-purple-500 hover:bg-purple-600 text-foreground shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                          : "bg-[#2a2a35] hover:bg-[#353545] text-foreground"
                      }`}
                    >
                      {device.on ? "TURN OFF" : "TURN ON"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">Brightness</p>
                      <p className="font-bold text-foreground text-lg">{device.brightness ?? 0}%</p>
                    </div>
                    <Slider
                      value={[device.brightness ?? 0]}
                      max={100}
                      step={1}
                      disabled={!device.on || !canEdit}
                      onValueChange={([v]) => patch({ brightness: v })}
                      trackClassName="h-3 bg-gradient-to-r from-[#181820] via-neutral-600 to-yellow-100"
                      rangeClassName="bg-transparent"
                      thumbClassName="h-6 w-6 border-[5px] border-[#111116] bg-white dark:bg-card shadow-xl"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <p className="font-semibold text-foreground">Tone</p>
                    <div className="flex gap-3">
                      {[
                        { label: "Warm", value: 2700, color: "bg-amber-500" },
                        { label: "Normal", value: 4000, color: "bg-[#f5f5f5]" },
                        { label: "Cool", value: 6500, color: "bg-blue-300" },
                      ].map((t) => (
                        <button
                          key={t.label}
                          disabled={!device.on || !canEdit}
                          onClick={() => patch({ colorTemp: t.value, color: undefined })}
                          className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-[1rem] font-bold transition-all border ${
                            device.colorTemp === t.value && !device.color
                              ? "border-white bg-white dark:bg-secondary/20 shadow-lg" 
                              : "border-border/20 bg-[#181820] text-muted-foreground hover:bg-[#202028]"
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full shadow-[0_0_10px_currentColor] ${t.color}`} />
                          <span className={device.colorTemp === t.value && !device.color ? "text-foreground" : ""}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">RGB Color</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {[
                        "#ef4444", "#f97316", "#eab308", 
                        "#22c55e", "#0ea5e9", "#3b82f6", 
                        "#a855f7", "#ec4899"
                      ].map((c) => (
                        <button
                          key={c}
                          disabled={!device.on || !canEdit}
                          onClick={() => patch({ color: c })}
                          className={`w-12 h-12 rounded-full transition-all border-2 ${
                            device.color === c
                              ? "border-white scale-110 shadow-[0_0_15px_currentColor]" 
                              : "border-transparent scale-100 opacity-60 hover:opacity-100 hover:scale-105"
                          }`}
                          style={{ backgroundColor: c, color: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {device.type === "tv" && (
                <div className="space-y-6 mt-4">
                  <div className="flex flex-col items-center justify-center p-8 border border-border/20 rounded-[1.5rem] bg-white dark:bg-secondary/10">
                    <div className="bg-purple-500/20 p-4 rounded-full mb-4">
                      <Tv className="h-8 w-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Smart Remote</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-[200px]">Launch the full-screen smart remote to control your TV</p>
                    <Link 
                      to="/tv-remote"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 rounded-full flex items-center justify-center gap-2 transition-all"
                    >
                      Open Remote
                    </Link>
                  </div>
                </div>
              )}

              {(device.type === "ac" || device.type === "fan") && (
                <div className="space-y-8 mt-2">
                  {device.type === "ac" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground">Temperature</p>
                        <p className="font-bold text-foreground text-lg">{device.temperature ?? 24}°C</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Snowflake className="h-6 w-6 text-blue-400" />
                        <Slider
                          value={[device.temperature ?? 24]}
                          min={16}
                          max={30}
                          step={1}
                          disabled={!device.on || !canEdit}
                          onValueChange={([v]) => patch({ temperature: v })}
                          trackClassName="h-3 bg-gradient-to-r from-blue-500 to-red-500"
                          rangeClassName="bg-transparent"
                          thumbClassName="h-6 w-6 border-[5px] border-[#111116] bg-white dark:bg-card shadow-xl"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <p className="font-semibold text-foreground">Fan speed</p>
                    <div className="flex gap-3">
                      {["Off", "Low", "Med", "High"].map((s, i) => (
                        <button
                          key={s}
                          disabled={!device.on || !canEdit}
                          onClick={() => patch({ fanSpeed: i })}
                          className={`flex-1 py-3 rounded-[1rem] font-bold transition-all ${
                            (device.fanSpeed ?? 0) === i 
                              ? "bg-white dark:bg-card text-black shadow-lg" 
                              : "bg-white dark:bg-secondary/10 text-muted-foreground hover:bg-white dark:bg-secondary/20"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {device.type === "ac" && (
                    <div className="space-y-4">
                      <p className="font-semibold text-foreground">Mode</p>
                      <div className="flex gap-3">
                        {["Cool", "Heat", "Auto", "Dry"].map((m) => (
                          <button
                            key={m}
                            disabled={!device.on || !canEdit}
                            onClick={() => patch({ mode: m })}
                            className={`flex-1 py-3 rounded-[1rem] font-bold transition-all ${
                              device.mode === m 
                                ? "bg-white dark:bg-card text-black shadow-lg" 
                                : "bg-white dark:bg-secondary/10 text-muted-foreground hover:bg-white dark:bg-secondary/20"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {device.type === "plug" && (
                <div className="mt-4 flex items-center justify-between p-4 rounded-[1.5rem] bg-white dark:bg-secondary/10 border border-border/20">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-purple-400" />
                    <span className="font-semibold text-muted-foreground">Live draw</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {device.on ? device.watts : 0} W
                  </span>
                </div>
              )}

              {device.type === "wpt" && (
                <div className="space-y-8 mt-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">Power output</p>
                      <p className="font-bold text-foreground text-lg">{device.output ?? 0}%</p>
                    </div>
                    <Slider
                      value={[device.output ?? 0]}
                      max={100}
                      step={5}
                      disabled={!device.on || !canEdit}
                      onValueChange={([v]) => patch({ output: v, watts: Math.round(v * 5) })}
                      trackClassName="h-3 bg-gradient-to-r from-[#181820] to-[#a855f7]"
                      rangeClassName="bg-transparent"
                      thumbClassName="h-6 w-6 border-[5px] border-[#111116] bg-white dark:bg-card shadow-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`rounded-[1.5rem] border p-4 ${((device.thermal ?? 0) > 55) ? "border-red-500/30 bg-red-500/10" : "border-border/20 bg-white dark:bg-secondary/10"}`}>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Thermometer className="h-4 w-4" /> Thermal
                      </div>
                      <p className={`text-2xl font-bold ${((device.thermal ?? 0) > 55) ? "text-red-400" : "text-foreground"}`}>
                        {device.thermal ?? 0}°C
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-purple-200 dark:border-purple-500/25 glass-card p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Gauge className="h-4 w-4" /> Connected
                      </div>
                      <p className="text-2xl font-bold text-foreground">2 devices</p>
                    </div>
                  </div>
                </div>
              )}

              {device.type === "sensor" && (
                <div className="mt-4 rounded-[1.5rem] bg-white dark:bg-secondary/10 p-4 border border-border/20">
                  <p className="text-sm font-medium text-muted-foreground">
                    Reporting normally · Connected to automation trigger
                  </p>
                </div>
              )}
            </div>

            {/* Energy graph */}
            <div className="rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-7 shadow-2xl">
              <h2 className="mb-6 text-lg font-bold text-muted-foreground">Energy, last 24h</h2>
              <div className="-ml-2 -mr-4">
                <EnergyAreaChart data={makeSeries(device.watts || 10)} height={200} />
              </div>
            </div>
          </div>

          {/* Side info */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-7 shadow-2xl space-y-5">
                            
                <div className="space-y-4 pb-4 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Bluetooth className="h-4 w-4 text-blue-400" /> Bluetooth Setup
                    </h3>
                  </div>
                  
                  {device.macAddress ? (
                    <div className="flex flex-col gap-3 rounded-[1rem] bg-blue-500/10 border border-blue-500/20 p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-200">Linked to MAC:</span>
                        <span className="text-sm font-mono font-bold text-foreground">{device.macAddress}</span>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full mt-2 font-bold"
                        onClick={() => {
                          patch({ macAddress: undefined });
                          toast.success("Device forgotten.");
                        }}
                      >
                        <Unlink className="h-4 w-4 mr-2" /> Reset Module
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-[1rem] bg-orange-500/10 border border-orange-500/20 p-4">
                      <p className="text-sm text-orange-200 font-medium">No Bluetooth module linked.</p>
                      
                      {!isLinking ? (
                        <Button 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-foreground font-bold"
                          onClick={() => {
                             setIsLinking(true);
                             handleRefreshDevices();
                          }}
                        >
                          <Link2 className="h-4 w-4 mr-2" /> Link Bluetooth Device
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-3 pt-2">
                          <p className="text-xs text-muted-foreground">1. Make sure your appliance is turned on.</p>
                          <Button variant="outline" size="sm" onClick={openBluetoothSettings} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-medium">
                            Open Bluetooth Settings
                          </Button>
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">2. Select your device from the scan list below.</p>
                            <Button variant="ghost" size="sm" onClick={handleRefreshDevices} disabled={isScanning} className="h-6 text-xs">
                              {isScanning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Refresh
                            </Button>
                          </div>
                          
                          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-lg border border-border/40 p-2 bg-black/50">
                            {pairedDevices.length === 0 ? (
                              <p className="text-xs text-center p-3 text-neutral-500">No paired devices found.</p>
                            ) : (
                              pairedDevices.map(d => (
                                <div 
                                  key={d.address}
                                  onClick={() => {
                                    patch({ macAddress: d.address });
                                    setIsLinking(false);
                                    toast.success(`Successfully linked ${d.name} (${d.address}) to ${device.name}!`);
                                  }}
                                  className="p-3 rounded-md cursor-pointer transition-colors bg-white dark:bg-secondary/10 hover:bg-white dark:bg-secondary/20"
                                >
                                  <div className="font-semibold text-sm text-foreground">{d.name || "Unknown"}</div>
                                  <div className="text-xs text-muted-foreground">{d.address}</div>
                                </div>
                              ))
                            )}
                          </div>
                          
                          <Button variant="ghost" size="sm" onClick={() => setIsLinking(false)} className="mt-2 text-muted-foreground">Cancel</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              
              <h2 className="text-lg font-bold text-muted-foreground">Details</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-muted-foreground">Device ID</span>
                  <span className="text-[15px] font-bold text-foreground">{device.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-muted-foreground">Room</span>
                  <span className="text-[15px] font-bold text-foreground">{room?.name ?? ", "}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-muted-foreground">Connection</span>
                  <span className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                    <span className={`h-2.5 w-2.5 rounded-full ${device.online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />
                    {device.online ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-muted-foreground">Live draw</span>
                  <span className="text-[15px] font-bold text-foreground">{device.on ? device.watts : 0} W</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-7 shadow-2xl space-y-5">
              <h2 className="text-lg font-bold text-muted-foreground">Linked Automations</h2>
              {linked.length === 0 ? (
                <p className="text-[15px] font-medium text-neutral-500">None enabled.</p>
              ) : (
                <div className="space-y-4">
                  {linked.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-foreground">{a.name}</span>
                      <span className="rounded-full bg-white dark:bg-secondary/10 border border-border/20 px-4 py-1.5 text-xs font-semibold text-muted-foreground tracking-wide">
                        {a.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-purple-200 dark:border-purple-500/25 glass-card p-7 shadow-2xl space-y-5">
              <h2 className="text-lg font-bold text-muted-foreground">Assigned Users</h2>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-[#a855f7] px-6 py-2 text-sm font-bold text-foreground shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                  Owner
                </span>
                <span className="rounded-full bg-white dark:bg-secondary/20 px-6 py-2 text-sm font-bold text-foreground">
                  Family
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-12 mb-8">
          <Button 
            variant="destructive" 
            className="w-full max-w-sm font-bold bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-foreground"
            onClick={() => {
              if (confirm("Are you sure you want to delete this device? This action cannot be undone.")) {
                dispatch({ type: "REMOVE_DEVICE", id: device.id });
                router.navigate({ to: "/" });
                toast.success(`${device.name} deleted successfully.`);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Device completely
          </Button>
        </div>
      </div>
    </div>
  );
}
