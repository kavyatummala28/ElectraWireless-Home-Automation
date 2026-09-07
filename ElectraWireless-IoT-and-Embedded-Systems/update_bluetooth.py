import os

def update_bluetooth_scanning():
    # 1. Update AddApplianceDialog.tsx
    path1 = "D:/17_ElectraWireless_Elly_IoT/src/components/home/AddApplianceDialog.tsx"
    with open(path1, "r", encoding="utf-8") as f:
        code1 = f.read()
        
    code1 = code1.replace('const devices = await listPairedDevices();', 
                         'const devices = await scanBluetoothDevices();\n      const paired = await listPairedDevices();\n      // combine and deduplicate\n      const all = [...paired, ...devices];\n      const unique = Array.from(new Map(all.map(item => [item.address, item])).values());\n      setScannedDevices(unique);')
                         
    with open(path1, "w", encoding="utf-8") as f:
        f.write(code1)

    # 2. Update device.$deviceId.tsx
    path2 = "D:/17_ElectraWireless_Elly_IoT/src/routes/device.$deviceId.tsx"
    with open(path2, "r", encoding="utf-8") as f:
        code2 = f.read()
        
    code2 = code2.replace('const devices = await listPairedDevices();', 
                         'const devices = await scanBluetoothDevices();\n      const paired = await listPairedDevices();\n      // combine and deduplicate\n      const all = [...paired, ...devices];\n      const unique = Array.from(new Map(all.map(item => [item.address, item])).values());\n      setPairedDevices(unique);')
                         
    # Also fix the text telling them to pair in settings first
    code2 = code2.replace('<p className="text-xs text-neutral-400">1. Pair the appliance in your phone settings first.</p>',
                          '<p className="text-xs text-neutral-400">1. Make sure your appliance is turned on.</p>')
    code2 = code2.replace('<p className="text-xs text-neutral-400">2. Select the device below to link it.</p>',
                          '<p className="text-xs text-neutral-400">2. Select your device from the scan list below.</p>')
                          
    code1 = code1.replace('<p className="text-xs text-neutral-400">1. Pair the appliance in your phone settings first.</p>',
                          '<p className="text-xs text-neutral-400">1. Make sure your appliance is turned on.</p>')
    code1 = code1.replace('<p className="text-xs text-neutral-400">2. Select the device below to link it.</p>',
                          '<p className="text-xs text-neutral-400">2. Select your device from the scan list below.</p>')

    with open(path2, "w", encoding="utf-8") as f:
        f.write(code2)

    with open(path1, "w", encoding="utf-8") as f:
        f.write(code1)

if __name__ == "__main__":
    update_bluetooth_scanning()
    print("Bluetooth scanning updated")
