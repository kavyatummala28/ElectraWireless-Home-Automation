import os

def update_bluetooth_ts():
    path = "D:/17_ElectraWireless_Elly_IoT/src/lib/home/bluetooth.ts"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()
    
    # 1. Add new functions for list and settings
    new_funcs = """
export async function openBluetoothSettings(): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    const bs = (window as any).bluetoothSerial;
    if (bs) bs.showBluetoothSettings();
  } else {
    toast.error("Bluetooth settings only available on native Android app.");
  }
}

export async function listPairedDevices(): Promise<BluetoothDevice[]> {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) return [];
  return new Promise((resolve, reject) => {
    const bs = (window as any).bluetoothSerial;
    if (!bs) return reject(new Error("Native Bluetooth plugin is not ready."));
    bs.list((devices: any[]) => resolve(devices), reject);
  });
}

"""
    if "openBluetoothSettings" not in code:
        code = code.replace('export async function scanBluetoothDevices()', new_funcs + 'export async function scanBluetoothDevices()')

    # 2. Update connectToMacAddress to actually use it
    if "const deviceId = existingId ||" in code and "connectToMacAddress" in code:
        # We need `toggleBluetoothDevice` to accept a macAddress
        pass

    # Rewrite toggleBluetoothDevice to accept macAddress and auto-connect
    toggle_old = "export async function toggleBluetoothDevice(id: string, isOn: boolean): Promise<boolean> {"
    toggle_new = """export async function toggleBluetoothDevice(id: string, isOn: boolean, macAddress?: string): Promise<boolean> {
  try {
    let characteristic = connectedCharacteristics.get(id);

    // If native platform and not connected, auto-connect using MAC address
    const isNative = Capacitor.isNativePlatform();
    if (isNative && characteristic !== "NATIVE_SPP" && macAddress) {
      const bs = (window as any).bluetoothSerial;
      if (bs) {
        try {
          await new Promise((resolve, reject) => {
             bs.isConnected(resolve, () => {
                 bs.connect(macAddress, resolve, reject);
             });
          });
          connectedCharacteristics.set(id, "NATIVE_SPP" as any);
          characteristic = "NATIVE_SPP" as any;
        } catch(e) {
          console.error("Failed to auto-connect to MAC:", macAddress, e);
        }
      }
    }
"""
    code = code.replace(toggle_old, toggle_new)

    # Rewrite pairBluetoothDevice to optionally connect to a specific MAC
    pair_old = "export async function pairBluetoothDevice(existingId?: string): Promise<BluetoothPairResult | null> {"
    pair_new = """export async function pairBluetoothDevice(existingId?: string, forceMac?: string): Promise<(BluetoothPairResult & {macAddress?: string}) | null> {
  try {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      return new Promise((resolve, reject) => {
        const bs = (window as any).bluetoothSerial;
        if (!bs) return reject(new Error("Native Bluetooth plugin is not ready."));

        if (forceMac) {
          toast(`Connecting to selected device...`);
          bs.connect(forceMac, () => {
             const deviceId = existingId || `ELLY-NATIVE-${forceMac}`;
             connectedCharacteristics.set(deviceId, "NATIVE_SPP" as any);
             resolve({ id: deviceId, name: "Bluetooth Appliance", macAddress: forceMac });
          }, (err: any) => reject(new Error(`Native connection failed: ${err}`)));
          return;
        }

        bs.list((devices: any[]) => {
          // If no forceMac, pick the first connected module, or fail
          const hc05 = devices.find((d: any) => d.name?.includes("HC-05") || d.name?.includes("HC-06") || d.name?.includes("HM-10"));
          if (!hc05) return reject(new Error("No paired HC-05 found! Please pair in Settings first."));
          
          toast(`Connecting to ${hc05.name}...`);
          bs.connect(hc05.address, () => {
            const deviceId = existingId || `ELLY-NATIVE-${hc05.address}`;
            connectedCharacteristics.set(deviceId, "NATIVE_SPP" as any);
            resolve({ id: deviceId, name: hc05.name, macAddress: hc05.address });
          }, (err: any) => reject(new Error(`Connection failed: ${err}`)));
        }, reject);
      });
    }
    // Web fallback below..."""
    
    code = code.replace(pair_old, pair_new)
    code = code.replace("resolve({\n              id: deviceId,\n              name: hc05.name\n            });", "")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

def update_store_tsx():
    path = "D:/17_ElectraWireless_Elly_IoT/src/lib/home/store.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # We need to import pairBluetoothDevice
    if "pairBluetoothDevice" not in code:
        code = code.replace('import { toggleBluetoothDevice, activateBluetoothDevice } from "./bluetooth";', 'import { toggleBluetoothDevice, activateBluetoothDevice, pairBluetoothDevice } from "./bluetooth";')

    old_toggle = """  const toggleDevice = async (id: string) => {
    const d = state.devices.find((x) => x.id === id);
    if (!d) return;
    
    // First, attempt to send the command to the hardware via Bluetooth
    const success = await toggleBluetoothDevice(id, !d.on);"""

    new_toggle = """  const toggleDevice = async (id: string) => {
    const d = state.devices.find((x) => x.id === id);
    if (!d) return;
    
    let success = false;
    if (d.connectionType === "third-party") {
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
    } else {
      success = await toggleBluetoothDevice(d.id, !d.on);
    }"""

    code = code.replace(old_toggle, new_toggle)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

def update_dialog_tsx():
    path = "D:/17_ElectraWireless_Elly_IoT/src/components/home/AddApplianceDialog.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # Import new funcs
    if "listPairedDevices" not in code:
        code = code.replace('import { scanBluetoothDevices, connectToMacAddress, type BluetoothDevice } from "../../lib/home/bluetooth";',
                            'import { scanBluetoothDevices, openBluetoothSettings, listPairedDevices, pairBluetoothDevice, type BluetoothDevice } from "../../lib/home/bluetooth";')

    # Add refresh logic
    refresh_func = """
  const handleRefreshDevices = async () => {
    setIsScanning(true);
    try {
      const devices = await listPairedDevices();
      setScannedDevices(devices);
      if (devices.length === 0) toast("No paired devices found. Pair in settings first.");
    } catch(e) {
      toast.error("Failed to load paired devices.");
    }
    setIsScanning(false);
  };
"""
    if "handleRefreshDevices" not in code:
        code = code.replace('const stopCamera = () => {', refresh_func + '  const stopCamera = () => {')

    # Update Step 4 UI
    old_step4 = """          {step === 4 && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">Brand</label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 focus:ring-blue-500">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181820] text-slate-900 dark:text-white">
                  <SelectItem value="ElectraWireless">ElectraWireless</SelectItem>
                  <SelectItem value="Philips">Philips</SelectItem>
                  <SelectItem value="LG">LG</SelectItem>
                  <SelectItem value="Samsung">Samsung</SelectItem>
                  <SelectItem value="Tuya">Tuya</SelectItem>
                  <SelectItem value="Generic">Generic / Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}"""

    new_step4 = """          {step === 4 && (
            <div className="flex flex-col gap-3">
              {connectionType === "direct" ? (
                <>
                  <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">Brand</label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger className="border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 focus:ring-blue-500">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181820] text-slate-900 dark:text-white">
                      <SelectItem value="ElectraWireless">ElectraWireless</SelectItem>
                      <SelectItem value="Philips">Philips</SelectItem>
                      <SelectItem value="LG">LG</SelectItem>
                      <SelectItem value="Samsung">Samsung</SelectItem>
                      <SelectItem value="Tuya">Tuya</SelectItem>
                      <SelectItem value="Generic">Generic / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-500 dark:text-neutral-400">
                    Pair your appliance in Android Bluetooth Settings first, then select it below.
                  </p>
                  <Button variant="outline" className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10" onClick={openBluetoothSettings}>
                    Open System Bluetooth Settings
                  </Button>
                  
                  <div className="flex items-center justify-between mt-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">Paired Devices</label>
                    <Button variant="ghost" size="sm" onClick={handleRefreshDevices} disabled={isScanning}>
                      {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10 p-2">
                    {scannedDevices.length === 0 ? (
                      <p className="text-xs text-center p-4 text-slate-500">No devices found. Click refresh.</p>
                    ) : (
                      scannedDevices.map(d => (
                        <div 
                          key={d.address}
                          onClick={() => setSelectedMac(d.address)}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${selectedMac === d.address ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                        >
                          <div className="font-semibold">{d.name || "Unknown"}</div>
                          <div className="text-xs opacity-70">{d.address}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}"""
    code = code.replace(old_step4, new_step4)
    
    # Update handlePairing to use the forced MAC
    old_pairing = """  const handlePairing = async () => {
    setStep(6);
    setIsPairing(true);
    
    try {
      const bleDevice = await pairBluetoothDevice();
      if (bleDevice) {
        setName(bleDevice.name);
        toast.success(`Connected to Bluetooth hardware: ${bleDevice.name}`);
        setIsPairing(false);
        handleSave(bleDevice.name, bleDevice.id);
      }
    } catch (error: any) {"""

    new_pairing = """  const handlePairing = async () => {
    setStep(6);
    setIsPairing(true);
    
    try {
      const bleDevice = await pairBluetoothDevice(undefined, connectionType === "third-party" ? selectedMac : undefined);
      if (bleDevice) {
        setName(bleDevice.name);
        toast.success(`Connected to Bluetooth hardware: ${bleDevice.name}`);
        setIsPairing(false);
        handleSave(bleDevice.name, bleDevice.id, bleDevice.macAddress);
      }
    } catch (error: any) {"""
    
    code = code.replace(old_pairing, new_pairing)
    
    old_save = "const handleSave = (overrideName?: string, overrideId?: string) => {"
    new_save = "const handleSave = (overrideName?: string, overrideId?: string, overrideMac?: string) => {"
    code = code.replace(old_save, new_save)
    
    code = code.replace("brand,\n      connectionType,\n    };", "brand,\n      connectionType,\n      macAddress: overrideMac,\n    };")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)


try:
    update_bluetooth_ts()
    print("updated bluetooth.ts")
    update_store_tsx()
    print("updated store.tsx")
    update_dialog_tsx()
    print("updated dialog")
except Exception as e:
    import traceback
    traceback.print_exc()
