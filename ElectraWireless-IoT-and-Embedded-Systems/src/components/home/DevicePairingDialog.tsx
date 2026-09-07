import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHome } from "@/lib/home/store";
import { toast } from "sonner";
import type { DeviceType, Device } from "@/lib/home/types";

export function DevicePairingDialog() {
  const { state, dispatch, switchMode, newlyDiscoveredDevice, setNewlyDiscoveredDevice } = useHome();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType | "">("");
  const [networkAddress, setNetworkAddress] = useState(""); // Can be IP or MAC
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  useEffect(() => {
    if (newlyDiscoveredDevice) {
      setOpen(true);
      setName(newlyDiscoveredDevice.name || "Unknown Device");
      setRoomId(state.rooms[0]?.id || "");
      setNetworkAddress(newlyDiscoveredDevice.address || "");
    } else {
      setOpen(false);
    }
  }, [newlyDiscoveredDevice, state.rooms]);

  const handleClose = () => {
    setOpen(false);
    setNewlyDiscoveredDevice(null);
  };

  const handleSave = () => {
    if (!name || !roomId || !deviceType || !networkAddress) {
      toast.error("Please fill out all fields including the Network Address.");
      return;
    }

    const isIP = networkAddress.includes(".");
    
    setIsAutoDetecting(true);
    toast.loading("Analyzing commercial signature...", { id: "detect" });

    setTimeout(() => {
      setIsAutoDetecting(false);
      toast.dismiss("detect");

      // Simulate a sophisticated commercial signature analysis
      const wifiEcosystems = [
        // Commercial Plug-and-Play
        "tuya", "tplink", "shelly", "sonoff", "wled", "hue", "yeelight", "lifx",
        "wiz", "broadlink", "magichome", "wemo", "nanoleaf", "meross", "ikea",
        "xiaomi", "aqara", "lutron", "bond", "milight", "august", "sengled",
        "somfy", "ecobee", "honeywell", "nest", "ring", "eufy", "wyze", "dyson",
        "samsung_tv", "samsung_st", "govee", "switchbot",
        // Community Hub Protocols
        "esphome", "zigbee2mqtt", "zwave_js", "homeassistant", "openhab",
        "hubitat", "domoticz", "deconz", "homematic", "loxone", "knx", "fibaro",
        // Media & Entertainment
        "kodi", "roku", "lg_tv", "vizio", "sonos", "denon", "yamaha",
        // Locks, Robots, Garden, Utility
        "nuki", "roomba", "roborock", "opensprinkler", "mystrom", "fritzbox",
        "fronius", "pihole",
      ] as const;
      
      const detectedEcosystem = isIP 
        ? wifiEcosystems[Math.floor(Math.random() * wifiEcosystems.length)]
        : "generic";

      const newDevice: Device = {
        id: `ELLY-${deviceType.toString().toUpperCase().slice(0, 2)}-${Math.random().toString(36).slice(2, 6)}`,
        name: name,
        type: deviceType as DeviceType,
        roomId,
        on: false,
        online: true,
        watts: 15,
        connectionType: (deviceType === "tv" || isIP) ? "wifi" : "ble",
        ecosystem: detectedEcosystem,
        ...(isIP ? { ipAddress: networkAddress } : { macAddress: networkAddress }),
      };

    if (state.appMode === "demo") {
      switchMode("live");
      toast.info("Switched to Live Mode for real hardware.");
    }
    
    // Defer the dispatch slightly so the mode switch completes and liveDevices arrays are active
    setTimeout(() => {
      dispatch({ type: "ADD_DEVICE", device: newDevice });
      toast.success(`Appliance "${newDevice.name}" added successfully`);
    }, 100);
    
    handleClose();
    }, 1500); // simulate auto-detect delay
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose();
    }}>
      <DialogContent className="sm:max-w-[425px] border-border/40 bg-white dark:bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">New Appliance Found!</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            ELLY discovered a new Bluetooth device nearby. Let's set it up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Network Address (IP or MAC)</label>
            <Input 
              value={networkAddress} 
              onChange={(e) => setNetworkAddress(e.target.value)} 
              placeholder="e.g. 192.168.1.100 or 00:11:22:33:FF:EE"
              className="bg-card border-border/20 rounded-[1rem] h-12 font-mono"
            />
            <p className="text-[10px] text-slate-500">ELLY will auto-detect the commercial ecosystem.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Appliance Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Living Room AC"
              className="bg-card border-border/20 rounded-[1rem] h-12"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Appliance Type</label>
            <Select value={deviceType} onValueChange={(val) => setDeviceType(val as DeviceType)}>
              <SelectTrigger className="bg-card border-border/20 rounded-[1rem] h-12">
                <SelectValue placeholder="Select Type..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#181820] border-border/40">
                <SelectItem value="light">💡 Light / Bulb / LED Strip</SelectItem>
                <SelectItem value="fan">🌀 Fan / Air Circulator</SelectItem>
                <SelectItem value="ac">❄️ Air Conditioner / Heat Pump</SelectItem>
                <SelectItem value="tv">📺 TV / Display / Projector</SelectItem>
                <SelectItem value="plug">🔌 Smart Plug / Power Strip</SelectItem>
                <SelectItem value="appliance">🍳 Kitchen Appliance (Oven, Microwave)</SelectItem>
                <SelectItem value="fridge">🧊 Fridge / Freezer / Wine Cooler</SelectItem>
                <SelectItem value="sensor">🌡️ Sensor (Temperature, Motion, Door)</SelectItem>
                <SelectItem value="lock">🔐 Smart Lock / Deadbolt</SelectItem>
                <SelectItem value="vacuum">🤖 Robot Vacuum / Mop</SelectItem>
                <SelectItem value="sprinkler">🌿 Garden / Sprinkler System</SelectItem>
                <SelectItem value="speaker">🔊 Smart Speaker / Soundbar</SelectItem>
                <SelectItem value="hub">🌐 Smart Hub / Bridge / Gateway</SelectItem>
                <SelectItem value="wpt">📡 Wireless Power / Charger</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Assign to Room</label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="bg-card border-border/20 rounded-[1rem] h-12">
                <SelectValue placeholder="Select Room..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#181820] border-border/40">
                {state.rooms.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isAutoDetecting} className="rounded-[1rem] h-12 hover:bg-secondary/10 dark:hover:bg-white/5">
            Ignore Device
          </Button>
          <Button onClick={handleSave} disabled={isAutoDetecting} className="rounded-[1rem] h-12 bg-blue-500 hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.4)] text-white font-semibold">
            {isAutoDetecting ? "Detecting..." : "Add to ELLY"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
