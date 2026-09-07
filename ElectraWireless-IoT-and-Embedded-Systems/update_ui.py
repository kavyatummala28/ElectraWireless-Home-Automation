import os

def update_store():
    path = "D:/17_ElectraWireless_Elly_IoT/src/lib/home/store.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()
    
    old_toggle = """    if (d.connectionType === "third-party") {
      if (!d.macAddress) {
        toast("No Bluetooth MAC address found. Attempting to pair...");
        try {
          const ble = await pairBluetoothDevice(d.id);
          if (ble && ble.macAddress) {
            dispatch({ type: "UPDATE_DEVICE", id, patch: { macAddress: ble.macAddress } });
            toast.success(`Paired and linked MAC: ${ble.macAddress}`);
            success = await toggleBluetoothDevice(d.id, !d.on, ble.macAddress);
          }
        } catch(e) {
          toast.error("Pairing failed. Open App Settings to connect.");
        }
      } else {
        success = await toggleBluetoothDevice(d.id, !d.on, d.macAddress);
      }
    } else {"""
    
    new_toggle = """    if (d.connectionType === "third-party") {
      if (!d.macAddress) {
        toast("Bluetooth not linked. Redirecting to setup...");
        setTimeout(() => { window.location.href = `/device/${d.id}`; }, 500);
        return;
      } else {
        success = await toggleBluetoothDevice(d.id, !d.on, d.macAddress);
      }
    } else {"""
    code = code.replace(old_toggle, new_toggle)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

def update_device_page():
    path = "D:/17_ElectraWireless_Elly_IoT/src/routes/device.$deviceId.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Add imports
    imports = """import { useState } from "react";
import { openBluetoothSettings, listPairedDevices, type BluetoothDevice } from "@/lib/home/bluetooth";
import { Bluetooth, RefreshCw, Unlink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
"""
    if "openBluetoothSettings" not in code:
        code = code.replace('import { useHome } from "@/lib/home/store";', imports + '\nimport { useHome } from "@/lib/home/store";')

    # 2. Add state inside component
    state_code = """
  const [isLinking, setIsLinking] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);

  const handleRefreshDevices = async () => {
    setIsScanning(true);
    try {
      const devices = await listPairedDevices();
      setPairedDevices(devices);
      if (devices.length === 0) toast("No paired devices found. Pair in OS settings first.");
    } catch(e) {
      toast.error("Failed to load paired devices.");
    }
    setIsScanning(false);
  };
"""
    code = code.replace('const device = state.devices.find((d) => d.id === deviceId);', 'const device = state.devices.find((d) => d.id === deviceId);' + state_code)

    # 3. Add Bluetooth section before "Details"
    details_header = """<h2 className="text-lg font-bold text-neutral-400">Details</h2>"""
    
    bt_section = """              {device.connectionType === "third-party" && (
                <div className="space-y-4 pb-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Bluetooth className="h-4 w-4 text-blue-400" /> Bluetooth Setup
                    </h3>
                  </div>
                  
                  {device.macAddress ? (
                    <div className="flex flex-col gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-200">Linked to MAC:</span>
                        <span className="text-sm font-mono font-bold text-white">{device.macAddress}</span>
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
                        <Unlink className="h-4 w-4 mr-2" /> Forget Device & Re-pair
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-xl bg-orange-500/10 border border-orange-500/20 p-4">
                      <p className="text-sm text-orange-200 font-medium">No Bluetooth module linked.</p>
                      
                      {!isLinking ? (
                        <Button 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
                          onClick={() => {
                             setIsLinking(true);
                             handleRefreshDevices();
                          }}
                        >
                          <Link2 className="h-4 w-4 mr-2" /> Link Bluetooth Device
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-3 pt-2">
                          <p className="text-xs text-neutral-400">1. Pair the appliance in your phone settings first.</p>
                          <Button variant="outline" size="sm" onClick={openBluetoothSettings} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-medium">
                            Open Bluetooth Settings
                          </Button>
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-neutral-400">2. Select the device below to link it.</p>
                            <Button variant="ghost" size="sm" onClick={handleRefreshDevices} disabled={isScanning} className="h-6 text-xs">
                              {isScanning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Refresh
                            </Button>
                          </div>
                          
                          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-lg border border-white/10 p-2 bg-black/50">
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
                                  className="p-3 rounded-md cursor-pointer transition-colors bg-white/5 hover:bg-white/10"
                                >
                                  <div className="font-semibold text-sm text-white">{d.name || "Unknown"}</div>
                                  <div className="text-xs text-neutral-400">{d.address}</div>
                                </div>
                              ))
                            )}
                          </div>
                          
                          <Button variant="ghost" size="sm" onClick={() => setIsLinking(false)} className="mt-2 text-neutral-400">Cancel</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <h2 className="text-lg font-bold text-neutral-400">Details</h2>"""

    code = code.replace(details_header, bt_section)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    update_store()
    update_device_page()
    print("Done")
