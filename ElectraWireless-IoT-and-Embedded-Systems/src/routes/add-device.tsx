import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Radar, Bluetooth, Wifi, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";
import type { Device, DeviceType } from "@/lib/home/types";
import { scanBluetoothDevices } from "@/lib/home/bluetooth";
import { autoDiscoverPanasonicTV } from "@/lib/panasonic";
import { autoDiscoverSamsungTV } from "@/lib/samsung";

export const Route = createFileRoute("/add-device")({
  head: () => ({
    meta: [
      { title: "Add Device, ELLY Home" },
      { name: "description", content: "Scan and add a new smart device." },
    ],
  }),
  component: AddDevicePage,
});

type DiscoveredDevice = {
  id: string;
  name: string;
  type: "wifi" | "ble";
  address: string;
  ecosystem?: string;
  isPaired?: boolean;
};

function AddDevicePage() {
  const { state, dispatch } = useHome();
  const router = useRouter();

  const [step, setStep] = useState<"scan" | "setup">("scan");
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);

  // Setup Form State
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState(state.rooms[0]?.id || "");
  const [type, setType] = useState<DeviceType>("light");

  // Unified Native Discovery
  useEffect(() => {
    if (step !== "scan") return;

    // 1. WiFi / IP Scanning (Panasonic TV)
    let isMounted = true;
    const scanWiFi = async () => {
      try {
        const panasonicIp = await autoDiscoverPanasonicTV();
        if (panasonicIp && isMounted) {
          setDiscoveredDevices(prev => {
            if (prev.some(d => d.address === panasonicIp)) return prev;
            return [...prev, {
              id: `panasonic-${panasonicIp.replace(/\./g, "")}`,
              name: "Panasonic Smart TV",
              type: "wifi",
              address: panasonicIp,
              ecosystem: "panasonic"
            }];
          });
        }
        
        const samsungIp = await autoDiscoverSamsungTV();
        if (samsungIp && isMounted) {
          setDiscoveredDevices(prev => {
            if (prev.some(d => d.address === samsungIp)) return prev;
            return [...prev, {
              id: `samsung-${samsungIp.replace(/\./g, "")}`,
              name: "Samsung Smart TV",
              type: "wifi",
              address: samsungIp,
              ecosystem: "samsung"
            }];
          });
        }
      } catch (e) {
        console.error("WiFi scan error", e);
      }
    };
    scanWiFi();

    // 2. Native BLE Scanning
    const isNative = (window as any).Capacitor?.isNativePlatform();
    if (isNative) {
      scanBluetoothDevices().then(devices => {
        devices.forEach((device: any) => {
          const mapped: DiscoveredDevice = {
            id: device.id || `ELLY-BLE-${Math.random().toString(36).substring(7)}`,
            name: device.name || "Unknown BLE Device",
            type: "ble",
            address: device.address || device.macAddress || "",
            isPaired: device.isPaired
          };
          // Avoid duplicates
          setDiscoveredDevices(prev => {
            if (prev.some(d => d.address === mapped.address)) return prev;
            return [...prev, mapped];
          });
        });
      }).catch(err => console.error("BLE Scan Error:", err));
    }
    
    return () => {
      isMounted = false;
    };
  }, [step]);

  const handleSelectDevice = (dev: DiscoveredDevice) => {
    setSelectedDevice(dev);
    setName(dev.name);
    
    // Guess type based on name
    const n = dev.name.toLowerCase();
    if (n.includes("plug") || n.includes("socket")) setType("plug");
    else if (n.includes("ac") || n.includes("air")) setType("ac");
    else if (n.includes("fan")) setType("fan");
    else if (n.includes("tv") || n.includes("panasonic")) setType("tv");
    else setType("light");

    setStep("setup");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedDevice) {
      toast.error("Please enter a device name.");
      return;
    }

    const newDevice: Device = {
      id: selectedDevice.id,
      name: name.trim(),
      type,
      roomId,
      on: false,
      online: true,
      watts: type === "light" ? 10 : type === "ac" ? 1000 : type === "tv" ? 120 : 50,
      connectionType: type === "tv" ? "wifi" : selectedDevice.type,
      ecosystem: selectedDevice.ecosystem || "generic",
      ...(selectedDevice.type === "wifi" ? { ipAddress: selectedDevice.address } : { macAddress: selectedDevice.address }),
    };

    dispatch({ type: "ADD_DEVICE", device: newDevice });
    toast.success(`Device "${newDevice.name}" added successfully.`);
    router.navigate({ to: "/all-devices" });
  };

  return (
    <div className="bg-background min-h-screen text-foreground pb-24 -mx-4 px-4 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-xl space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === "setup" ? setStep("scan") : router.history.back()}
            className="p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors border border-border/20"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              {step === "scan" ? "Discover Devices" : "Setup Device"}
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              {step === "scan" ? "Scanning for local smart appliances..." : "Configure your new smart device."}
            </p>
          </div>
        </div>

        {step === "scan" ? (
          <div className="space-y-8 mt-8">
            {/* Radar Animation */}
            <div className="relative flex items-center justify-center h-48 w-full">
              <div className="absolute w-32 h-32 bg-primary/20 rounded-full animate-ping" />
              <div className="absolute w-48 h-48 border border-primary/30 rounded-full" />
              <div className="absolute w-64 h-64 border border-primary/10 rounded-full" />
              <div className="z-10 bg-primary rounded-full p-4 shadow-[0_0_30px_rgba(var(--color-primary),0.5)]">
                <Radar className="w-8 h-8 text-primary-foreground animate-pulse" />
              </div>
            </div>

            {/* Discovered Devices List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-muted-foreground px-2 uppercase tracking-wider flex items-center justify-between">
                Discovered in Area
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </h3>
              
              {discoveredDevices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/40 rounded-[2rem]">
                  Listening for signals...
                </div>
              ) : (
                <div className="space-y-2">
                  {discoveredDevices.map((dev, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleSelectDevice(dev)}
                      className="flex items-center justify-between p-4 glass-card border border-border/20 rounded-[1.5rem] hover:border-primary/50 cursor-pointer transition-all shadow-sm group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          {dev.type === "wifi" ? (
                            <Wifi className="w-5 h-5 text-primary" />
                          ) : (
                            <Bluetooth className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">{dev.name}</p>
                            {dev.isPaired && (
                              <span className="text-[10px] uppercase font-bold bg-success/20 text-success px-2 py-0.5 rounded-full">
                                Paired
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{dev.address || "No Address"}</p>
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <p className="text-center text-xs text-muted-foreground">
              Make sure your device is powered on and in pairing mode.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-primary/20 glass-card p-6 shadow-sm">
            <div className="bg-card p-4 rounded-[1.5rem] border border-border/20 mb-6">
              <p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Selected Hardware</p>
              <div className="flex items-center gap-2">
                 {selectedDevice?.type === "wifi" ? <Wifi className="w-4 h-4 text-primary" /> : <Bluetooth className="w-4 h-4 text-primary" />}
                 <p className="text-sm font-medium">{selectedDevice?.name} <span className="text-muted-foreground">({selectedDevice?.address})</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Device Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary/50 border border-border/20 rounded-[1.5rem] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="e.g. Living Room TV"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Room</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-secondary/50 border border-border/20 rounded-[1.5rem] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
              >
                {state.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Device Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DeviceType)}
                className="w-full bg-secondary/50 border border-border/20 rounded-[1.5rem] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
              >
                <option value="light">Light</option>
                <option value="plug">Smart Plug</option>
                <option value="ac">Air Conditioner</option>
                <option value="fan">Fan</option>
                <option value="tv">TV</option>
                <option value="camera">Camera</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-[1.5rem] transition-all shadow-[0_0_20px_rgba(var(--color-primary),0.3)] hover:scale-[1.02] active:scale-95"
            >
              Add Device to Home
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
