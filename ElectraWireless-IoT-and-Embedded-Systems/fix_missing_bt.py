import os
import re

def fix_store():
    path = "D:/17_ElectraWireless_Elly_IoT/src/lib/home/store.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # Change toggleDevice to apply to all devices and add returns
    old_impl = """    let success = false;
    if (d.connectionType === "third-party") {
      if (!d.macAddress) {
        toast("Bluetooth not linked. Redirecting to setup...");
        return "REDIRECT";
      } else {
        success = await toggleBluetoothDevice(d.id, !d.on, d.macAddress);
      }
    } else {
      success = await toggleBluetoothDevice(d.id, !d.on);
    }
    
    if (success) {
      // If hardware acknowledges, update the UI
      dispatch({ type: "TOGGLE_DEVICE", id });
    } else {
      toast.error(`Failed to send command to ${d.name} over Bluetooth. Ensure it is powered on and in range.`);
    }
  };"""

    new_impl = """    let success = false;
    if (!d.macAddress) {
      toast("Bluetooth not linked. Redirecting to setup...");
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
    
    if "return true;" not in code.split("toggleDevice = ")[1]:
        code = code.replace(old_impl, new_impl)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

def fix_device_page():
    path = "D:/17_ElectraWireless_Elly_IoT/src/routes/device.$deviceId.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # Remove the connectionType check wrapper
    if "{device.connectionType === \"third-party\" && (" in code:
        code = code.replace("{device.connectionType === \"third-party\" && (", "")
        # Now find the closing parenthesis and div of that block
        # It's right before <h2 className="text-lg font-bold text-neutral-400">Details</h2>
        old_end = """                  )}
                </div>
              )}
              
              <h2 className="text-lg font-bold text-neutral-400">Details</h2>"""
        new_end = """                  )}
                </div>
              
              <h2 className="text-lg font-bold text-neutral-400">Details</h2>"""
        code = code.replace(old_end, new_end)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    fix_store()
    fix_device_page()
    print("Done")
