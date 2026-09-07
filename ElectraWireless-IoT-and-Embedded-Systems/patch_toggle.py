import os

def patch_bluetooth_and_ui():
    # 1. Update DeviceTile.tsx
    path1 = "D:/17_ElectraWireless_Elly_IoT/src/components/home/DeviceTile.tsx"
    with open(path1, "r", encoding="utf-8") as f:
        code1 = f.read()
        
    code1 = code1.replace('disabled={!device.online}', 'disabled={!canEdit}')
    
    with open(path1, "w", encoding="utf-8") as f:
        f.write(code1)
        
    # 2. Update device.$deviceId.tsx
    path2 = "D:/17_ElectraWireless_Elly_IoT/src/routes/device.$deviceId.tsx"
    with open(path2, "r", encoding="utf-8") as f:
        code2 = f.read()
        
    code2 = code2.replace('disabled={!device.online || !canEdit}', 'disabled={!canEdit}')
    
    with open(path2, "w", encoding="utf-8") as f:
        f.write(code2)

    # 3. Update store.tsx toggleDevice to automatically pair if no macAddress
    path3 = "D:/17_ElectraWireless_Elly_IoT/src/lib/home/store.tsx"
    with open(path3, "r", encoding="utf-8") as f:
        code3 = f.read()
        
    old_toggle = """  const toggleDevice = async (id: string): Promise<boolean | "REDIRECT"> => {
    const d = state.devices.find((x) => x.id === id);
    if (!d) return false;
    
    let success = false;
    if (!d.macAddress) {
      toast.error("Bluetooth not linked! Please link a device in the Bluetooth Setup section.");
      return "REDIRECT";
    } else {
      success = await toggleBluetoothDevice(d.id, !d.on, d.macAddress);
    }
    
    if (success) {
      // If hardware acknowledges, update the UI
      dispatch({ type: "TOGGLE_DEVICE", id });
      return true;
    } else {
      toast.error(`Failed to send command to ${d.name} over Bluetooth. Ensure it is powered on and in range.`);
      return false;
    }
  };"""
  
    new_toggle = """  const toggleDevice = async (id: string): Promise<boolean | "REDIRECT"> => {
    const d = state.devices.find((x) => x.id === id);
    if (!d) return false;
    
    let success = false;
    let targetMac = d.macAddress;
    
    if (!targetMac) {
      // The user requested that we do NOT redirect or show a notification telling them to pair in settings.
      // Instead, we will initiate pairing immediately.
      toast.loading("No Bluetooth linked. Starting discovery...", { id: "bt-pair-toggle" });
      try {
        const { scanBluetoothDevices } = await import("./bluetooth");
        const devices = await scanBluetoothDevices();
        if (devices && devices.length > 0) {
          toast.success("Found devices! Automatically linking to the first available...", { id: "bt-pair-toggle" });
          targetMac = devices[0].address;
          dispatch({ type: "UPDATE_DEVICE", id: d.id, patch: { macAddress: targetMac } });
        } else {
          toast.error("No unpaired devices found nearby.", { id: "bt-pair-toggle" });
          return "REDIRECT";
        }
      } catch (err: any) {
        toast.error(`Pairing failed: ${err.message}`, { id: "bt-pair-toggle" });
        return "REDIRECT";
      }
    }
    
    success = await toggleBluetoothDevice(d.id, !d.on, targetMac);
    
    if (success) {
      // If hardware acknowledges, update the UI
      dispatch({ type: "TOGGLE_DEVICE", id });
      return true;
    } else {
      toast.error(`Failed to send command to ${d.name} over Bluetooth. Ensure it is powered on and in range.`);
      return false;
    }
  };"""
  
    code3 = code3.replace(old_toggle, new_toggle)
    
    with open(path3, "w", encoding="utf-8") as f:
        f.write(code3)

if __name__ == "__main__":
    patch_bluetooth_and_ui()
    print("Toggle and Pairing logic patched")
