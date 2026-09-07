import os
import re

file_path = "D:/17_ElectraWireless_Elly_IoT/src/components/home/AddApplianceDialog.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace imports
content = re.sub(r"import '@tensorflow/tfjs';\nimport \* as mobilenet from '@tensorflow-models/mobilenet';\nimport \* as cocoSsd from '@tensorflow-models/coco-ssd';", "", content)
content = re.sub(r"import \{ pairBluetoothDevice \} from \"\.\./\.\./lib/home/bluetooth\";", 'import { scanBluetoothDevices, connectToMacAddress, type BluetoothDevice } from "../../lib/home/bluetooth";', content)

# Remove Camera/Scanner state
content = re.sub(r"  const videoRef = useRef<HTMLVideoElement \| null>\(null\);\n  const streamRef = useRef<MediaStream \| null>\(null\);\n  const canvasRef = useRef<HTMLCanvasElement \| null>\(null\);\n  const \[model, setModel\] = useState<mobilenet\.MobileNet \| null>\(null\);\n  const \[objectDetector, setObjectDetector\] = useState<cocoSsd\.ObjectDetection \| null>\(null\);\n  const \[snehalEmbeddings, setSnehalEmbeddings\] = useState<Float32Array\[\]>\(\[\]\);\n  const \[prediction, setPrediction\] = useState<string \| null>\(null\);\n  const \[scanProb, setScanProb\] = useState<number>\(0\);",
    "  const [scannedDevices, setScannedDevices] = useState<BluetoothDevice[]>([]);\n  const [selectedMac, setSelectedMac] = useState<string>(\"\");\n", content)

# Remove Camera useEffect
camera_ue = r"  useEffect\(\(\) => \{\n    let isMounted = true;\n    Promise\.all\(\[mobilenet\.load\(\), cocoSsd\.load\(\)\]\)\.then\(async \(\[m, objDetector\]\) => \{[\s\S]*?    \}\);\n    return \(\) => \{ isMounted = false; \};\n  \}, \[\]\);\n"
content = re.sub(camera_ue, "", content)

# Replace startCamera, stopCamera, scanFrame, handleCapture with scanForBluetooth
ai_funcs = r"  // AI Camera Functions\n  const startCamera = async \(\) => \{[\s\S]*?  const handleCapture = \(predictedType: string\) => \{[\s\S]*?  \};\n"
new_bt_funcs = """
  const handleScanBluetooth = async () => {
    setIsScanning(true);
    try {
      const devices = await scanBluetoothDevices();
      setScannedDevices(devices);
    } catch (e) {
      toast.error("Bluetooth scan failed. Ensure location permissions are granted.");
    } finally {
      setIsScanning(false);
    }
  };
"""
content = re.sub(ai_funcs, new_bt_funcs, content)

# Update reset state
content = re.sub(r"      setIsScanning\(false\);\n      setPrediction\(null\);\n      setScanProb\(0\);\n    \} else \{\n      stopCamera\(\);\n    \}", "      setIsScanning(false);\n      setScannedDevices([]);\n      setSelectedMac(\"\");\n    }", content)

# Update handlePairing
handle_pairing_old = r"  const handlePairing = async \(\) => \{\n    setIsPairing\(true\);\n    let connectedId = undefined;\n    let finalName = name;\n\n    try \{\n      const result = await pairBluetoothDevice\(\);\n      if \(result\) \{\n        connectedId = result\.id;\n        if \(!name\) finalName = result\.name;\n      \}\n    \} catch \(err: any\) \{\n      toast\.error\(err\.message \|\| \"Bluetooth pairing failed\"\);\n      setIsPairing\(false\);\n      return;\n    \}"
handle_pairing_new = """  const handlePairing = async () => {
    setIsPairing(true);
    let connectedId = undefined;
    let finalName = name;

    try {
      if (!selectedMac && connectionType === "third-party") {
        throw new Error("Please select a bluetooth device first.");
      }
      
      if (connectionType === "third-party" && selectedMac) {
         const deviceName = scannedDevices.find(d => d.address === selectedMac)?.name || "Unknown Device";
         const result = await connectToMacAddress(selectedMac, deviceName);
         connectedId = result.id;
         if (!name) finalName = result.name;
      } else {
         // Direct connect simulation
         await new Promise((r) => setTimeout(r, 2000));
         if (!name) finalName = "ELLY Direct Appliance";
      }
    } catch (err: any) {
      toast.error(err.message || "Bluetooth pairing failed");
      setIsPairing(false);
      return;
    }"""
content = content.replace("  const handlePairing = async () => {\n    setIsPairing(true);\n    let connectedId = undefined;\n    let finalName = name;\n\n    try {\n      const result = await pairBluetoothDevice();\n      if (result) {\n        connectedId = result.id;\n        if (!name) finalName = result.name;\n      }\n    } catch (err: any) {\n      toast.error(err.message || \"Bluetooth pairing failed\");\n      setIsPairing(false);\n      return;\n    }", handle_pairing_new)

# Apply dark/light classes to step 1-6 UI elements
content = content.replace("bg-[#111116] text-white", "bg-white dark:bg-[#111116] text-slate-900 dark:text-white")
content = content.replace("bg-[#181820] text-white", "bg-slate-50 dark:bg-[#181820] text-slate-900 dark:text-white")
content = content.replace("bg-white/5", "bg-slate-100 dark:bg-white/5")
content = content.replace("bg-white/10", "bg-slate-200 dark:bg-white/10")
content = content.replace("border-white/10", "border-slate-200 dark:border-white/10")
content = content.replace("text-neutral-300", "text-slate-700 dark:text-neutral-300")
content = content.replace("text-neutral-400", "text-slate-500 dark:text-neutral-400")

# Re-write Step 4 to show Bluetooth Scanner if third-party
step4_old = r"          \{step === 4 && \([\s\S]*?          \}\)"
step4_new = """          {step === 4 && (
            <div className="flex flex-col gap-3">
              {connectionType === "third-party" ? (
                 <div className="flex flex-col gap-3">
                   <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">Scan for Devices</label>
                   <Button 
                     onClick={handleScanBluetooth} 
                     disabled={isScanning}
                     className="bg-blue-500 hover:bg-blue-600 text-white w-full"
                   >
                     {isScanning ? <Loader2 className="animate-spin h-5 w-5" /> : <Bluetooth className="h-5 w-5 mr-2" />}
                     {isScanning ? "Scanning..." : "Scan Bluetooth Devices"}
                   </Button>
                   {scannedDevices.length > 0 && (
                     <div className="flex flex-col gap-2 mt-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                       {scannedDevices.map(d => (
                         <div 
                           key={d.address} 
                           onClick={() => setSelectedMac(d.address)}
                           className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedMac === d.address ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                         >
                           <div className="font-bold text-sm">{d.name || "Unknown Device"}</div>
                           <div className="text-xs text-slate-500 dark:text-neutral-400">{d.address}</div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
              ) : (
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
              )}
            </div>
          )}"""
content = re.sub(step4_old, step4_new, content)

# Remove the AI Camera from step 3 entirely
step3_old = r"          \{step === 3 && \([\s\S]*?          \}\)"
step3_new = """          {step === 3 && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">Select Appliance Type</label>
              <Select value={deviceType} onValueChange={(v) => setDeviceType(v as DeviceType)}>
                <SelectTrigger className="border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 focus:ring-blue-500">
                  <SelectValue placeholder="Select appliance type" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181820] text-slate-900 dark:text-white">
                  <SelectItem value="light">Smart Light</SelectItem>
                  <SelectItem value="ac">Air Conditioner</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="fridge">Refrigerator</SelectItem>
                  <SelectItem value="plug">Smart Plug</SelectItem>
                  <SelectItem value="sensor">Sensor</SelectItem>
                  <SelectItem value="tv">Television</SelectItem>
                  <SelectItem value="appliance">Other Appliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}"""
content = re.sub(step3_old, step3_new, content)

# Disable next button logic
content = content.replace("(step === 4 && !brand)", "(step === 4 && connectionType !== 'third-party' && !brand) || (step === 4 && connectionType === 'third-party' && !selectedMac)")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated AddApplianceDialog.tsx")
