import { useState, useEffect, useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Wifi, Bluetooth, Zap, Loader2, Camera, ScanLine, X, RefreshCw } from "lucide-react";
import { useHome } from "@/lib/home/store";
import { scanBluetoothDevices, openBluetoothSettings, listPairedDevices, pairBluetoothDevice, type BluetoothDevice } from "../../lib/home/bluetooth";
import type { DeviceType, Device } from "@/lib/home/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AddApplianceDialog({ defaultRoomId }: { defaultRoomId?: string }) {
  const { state, dispatch } = useHome();
  const [open, setOpen] = useState(false);

  // Form State
  const [step, setStep] = useState(1);
  const [roomId, setRoomId] = useState<string>(defaultRoomId || "");
  const [connectionType, setConnectionType] = useState<"direct" | "third-party">("direct");
  const [deviceType, setDeviceType] = useState<DeviceType | "">("");
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [lightMode, setLightMode] = useState<"warm" | "cool" | "normal" | "rgb+">("normal");
  
  // Pairing & AI State
  const [isPairing, setIsPairing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<BluetoothDevice[]>([]);
  const [selectedMac, setSelectedMac] = useState<string>("");
  const [prediction, setPrediction] = useState<string | null>(null);
  const [scanProb, setScanProb] = useState<number>(0);

  // Refs for AI Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Placeholder AI Model References (Connect to your TensorFlow / Vision pipeline)
  const model = null as any; 
  const objectDetector = null as any; 
  const snehalEmbeddings: any[] = [];

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setStep(defaultRoomId ? 2 : 1);
      setRoomId(defaultRoomId || (state.rooms.length > 0 ? state.rooms[0].id : ""));
      setConnectionType("direct");
      setDeviceType("");
      setBrand("");
      setName("");
      setLightMode("normal");
      setIsPairing(false);
      setIsScanning(false);
      setScannedDevices([]);
      setSelectedMac("");
      setPrediction(null);
      setScanProb(0);
    }
  }, [open, defaultRoomId, state.rooms]);

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  // AI Camera Functions
  const startCamera = async () => {
    setIsScanning(true);
    setPrediction(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanFrame();
    } catch (err) {
      toast.error("Could not access camera for AI Vision.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsScanning(false);
  };

  const handleRefreshDevices = async () => {
    setIsScanning(true);
    try {
      const devices = await scanBluetoothDevices();
      const paired = await listPairedDevices();
      const all = [...paired, ...devices];
      const unique = Array.from(new Map(all.map(item => [item.address, item])).values());
      setScannedDevices(unique);
      if (unique.length === 0) toast("No devices found. Pair in OS settings or ensure they are nearby.");
    } catch(e) {
      toast.error("Failed to load paired devices.");
    }
    setIsScanning(false);
  };

  const scanFrame = async () => {
    if (!isScanning || !model || !objectDetector || !videoRef.current || videoRef.current.readyState < 2) {
      if (isScanning) requestAnimationFrame(scanFrame);
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    try {
      if (canvas) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const detections = await objectDetector.detect(video);
          let topPrediction = null;

          for (const det of detections) {
            let label = det.class;
            
            const [x, y, width, height] = det.bbox;
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = width;
            cropCanvas.height = height;
            const cropCtx = cropCanvas.getContext('2d');
            
            if (cropCtx && det.score > 0.5) {
              cropCtx.drawImage(video, x, y, width, height, 0, 0, width, height);
              
              try {
                const predictions = await model.classify(cropCanvas);
                if (predictions && predictions.length > 0) {
                  const mobileNetClass = predictions[0].className.split(',')[0].toLowerCase();
                  const isHumanClothing = ["suit", "t-shirt", "jersey", "sweatshirt", "cardigan", "jean", "wig", "sunglasses", "seat belt", "neck brace", "bow tie", "mask", "abaya", "academic gown", "apron", "bathing cap", "bikini", "brassiere", "cowboy hat", "crash helmet", "fur coat", "gown", "lab coat", "miniskirt", "overskirt", "pajama", "poncho", "shower cap", "ski mask", "sombrero", "stole", "swimming trunks", "trench coat", "vest", "nipple", "face powder", "hair spray", "lipstick", "lotion", "perfume", "stethoscope"].some(c => mobileNetClass.includes(c));

                  if (det.class === "person" || isHumanClothing) {
                    if (snehalEmbeddings.length > 0) {
                      const activation = model.infer(cropCanvas, true);
                      const data = activation.dataSync() as Float32Array;
                      activation.dispose();

                      let maxSim = 0;
                      for (const emb of snehalEmbeddings) {
                        let dotProduct = 0, normA = 0, normB = 0;
                        for (let i = 0; i < data.length; i++) {
                          dotProduct += data[i] * emb[i];
                          normA += data[i] * data[i];
                          normB += emb[i] * emb[i];
                        }
                        const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                        if (sim > maxSim) maxSim = sim;
                      }

                      if (maxSim > 0.60) {
                        label = `User ID : #0001 (${Math.round(maxSim * 100)}%)`;
                      } else {
                        label = `Unknown Person (${Math.round(maxSim * 100)}%)`;
                      }
                    } else {
                      label = "Unknown Person";
                    }
                  } else {
                    label = mobileNetClass.charAt(0).toUpperCase() + mobileNetClass.slice(1);
                  }
                }
              } catch (e) {}
            }

            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;
            const scale = Math.max(scaleX, scaleY);
            const offsetX = (canvas.width - video.videoWidth * scale) / 2;
            const offsetY = (canvas.height - video.videoHeight * scale) / 2;

            const drawX = x * scale + offsetX;
            const drawY = y * scale + offsetY;
            const drawW = width * scale;
            const drawH = height * scale;

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.strokeRect(drawX, drawY, drawW, drawH);
            
            ctx.fillStyle = '#3b82f6';
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(drawX, drawY - 24, textWidth + 10, 24);
            
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.fillText(label, drawX + 5, drawY - 6);

            if (!topPrediction || det.score > topPrediction.score) {
              topPrediction = { label, score: det.score };
            }
          }

          if (topPrediction) {
            setPrediction(topPrediction.label);
            setScanProb(topPrediction.score);
          } else {
            setPrediction(null);
          }
        }
      }
    } catch (e) {}
    
    if (isScanning) {
      requestAnimationFrame(scanFrame);
    }
  };

  const handleCapture = (className: string) => {
    let detectedType: DeviceType = "appliance";
    if (className.includes("tv") || className.includes("television") || className.includes("monitor") || className.includes("screen")) detectedType = "tv";
    else if (className.includes("refrigerator") || className.includes("fridge")) detectedType = "fridge";
    else if (className.includes("fan") || className.includes("blower")) detectedType = "fan";
    else if (className.includes("air conditioner") || className.includes("cooler")) detectedType = "ac";
    else if (className.includes("lamp") || className.includes("light") || className.includes("bulb")) detectedType = "light";
    else if (className.includes("plug") || className.includes("socket")) detectedType = "plug";

    setDeviceType(detectedType);
    setName(className.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    toast.success(`AI Vision detected: ${className}`);
    stopCamera();
    handleNext();
  };

  const handlePairing = async () => {
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
    } catch (error: any) {
      toast.error("Bluetooth pairing failed or cancelled. Simulating connection instead.");
      setTimeout(() => {
        setIsPairing(false);
        handleSave();
      }, 2000);
    }
  };

  const handleSave = (overrideName?: string, overrideId?: string, overrideMac?: string) => {
    const newDevice: Device = {
      id: overrideId || `ELLY-${deviceType.toString().toUpperCase().slice(0, 2)}-${Math.random().toString(36).slice(2, 6)}`,
      name: overrideName || name || `${brand} ${deviceType}`,
      type: deviceType as DeviceType,
      roomId,
      on: false,
      online: true,
      watts: 15,
      brand,
      connectionType,
      macAddress: overrideMac,
    };

    if (deviceType === "light") {
      newDevice.lightMode = lightMode;
      newDevice.brightness = 100;
      newDevice.colorTemp = lightMode === "warm" ? 2700 : lightMode === "cool" ? 6000 : 4000;
    }

    dispatch({ type: "ADD_DEVICE", device: newDevice });
    toast.success(`Appliance "${newDevice.name}" added successfully`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-full bg-blue-500 hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.4)] text-foreground">
          <Plus className="h-4 w-4" />
          Add Appliance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-border/40 bg-white dark:bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Appliance</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 1 && "Select the room for this appliance."}
            {step === 2 && "How does this appliance connect?"}
            {step === 3 && "What type of appliance is it?"}
            {step === 4 && "Select the brand of the appliance."}
            {step === 5 && "Configure specific options and give it a name."}
            {step === 6 && "Pairing appliance to ELLY."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-foreground/80">Room</label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="border-border/40 bg-secondary/10 focus:ring-blue-500">
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent className="border-border/40 bg-slate-50 dark:bg-[#181820] text-foreground">
                  {state.rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-foreground/80">Connection Method</label>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant={connectionType === "direct" ? "default" : "outline"}
                  className={cn(
                    "h-auto justify-start p-4 text-left transition-all",
                    connectionType === "direct" 
                      ? "bg-blue-500 hover:bg-blue-600 text-foreground shadow-[0_0_15px_rgba(59,130,246,0.4)] border-transparent" 
                      : "bg-secondary/10 border-border/40 hover:bg-secondary/20 text-foreground"
                  )}
                  onClick={() => setConnectionType("direct")}
                >
                  <div className="flex items-center gap-3">
                    <Zap className={cn("h-5 w-5", connectionType === "direct" ? "text-foreground" : "text-blue-400")} />
                    <div>
                      <div className="font-semibold">ELLY Direct</div>
                      <div className="text-xs font-normal opacity-80">
                        Native ElectraWireless protocol
                      </div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant={connectionType === "third-party" ? "default" : "outline"}
                  className={cn(
                    "h-auto justify-start p-4 text-left transition-all",
                    connectionType === "third-party" 
                      ? "bg-blue-500 hover:bg-blue-600 text-foreground shadow-[0_0_15px_rgba(59,130,246,0.4)] border-transparent" 
                      : "bg-secondary/10 border-border/40 hover:bg-secondary/20 text-foreground"
                  )}
                  onClick={() => setConnectionType("third-party")}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("flex -space-x-2", connectionType === "third-party" ? "text-foreground" : "text-blue-400")}>
                      <Wifi className="h-5 w-5" />
                      <Bluetooth className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">3rd Party Smart App</div>
                      <div className="text-xs font-normal opacity-80">
                        Connect appliances via Bluetooth/WiFi
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              {!isScanning ? (
                <>
                  <Button 
                    variant="outline" 
                    className="w-full h-32 flex flex-col items-center justify-center gap-3 border-border/40 bg-secondary/10 hover:bg-secondary/20 text-foreground group transition-all"
                    onClick={startCamera}
                  >
                    <div className="p-3 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                      <Camera className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                      <span className="block font-bold">AI Vision Scan</span>
                      <span className="text-xs text-muted-foreground">Point camera to auto-detect</span>
                    </div>
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-secondary/20" />
                    <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">OR</span>
                    <div className="h-px flex-1 bg-secondary/20" />
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-foreground/80">Select Manually</label>
                    <Select value={deviceType} onValueChange={(v) => setDeviceType(v as DeviceType)}>
                      <SelectTrigger className="border-border/40 bg-secondary/10 focus:ring-blue-500">
                        <SelectValue placeholder="Select appliance type" />
                      </SelectTrigger>
                      <SelectContent className="border-border/40 bg-slate-50 dark:bg-[#181820] text-foreground">
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
                </>
              ) : (
                <div className="relative overflow-hidden rounded-[1.5rem] bg-black aspect-square flex flex-col">
                  <div className="absolute top-2 right-2 z-10">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-black/50 text-foreground hover:bg-black/80" onClick={stopCamera}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <video 
                    ref={videoRef} 
                    className="h-full w-full object-cover" 
                    playsInline 
                    muted 
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full pointer-events-none z-10"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <ScanLine className="h-32 w-32 text-blue-500/50 animate-pulse" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-center text-sm font-medium text-foreground">
                      {model ? "Analyzing object..." : "Loading AI model..."}
                    </p>
                    {prediction && (
                      <div className="flex flex-col items-center mt-2 gap-2">
                        <p className="text-center text-xs text-blue-400 capitalize font-bold">
                          Detected: {prediction} ({Math.round(scanProb * 100)}%)
                        </p>
                        <Button 
                          size="sm" 
                          onClick={() => handleCapture(prediction)}
                          className="bg-blue-500 hover:bg-blue-600 text-foreground rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] h-8 px-6"
                        >
                          Capture
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-3">
              {connectionType === "direct" ? (
                <>
                  <label className="text-sm font-medium text-slate-700 dark:text-foreground/80">Brand</label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger className="border-border/40 bg-secondary/10 focus:ring-blue-500">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent className="border-border/40 bg-slate-50 dark:bg-[#181820] text-foreground">
                      <SelectItem value="ElectraWireless">ElectraWireless</SelectItem>
                      <SelectItem value="LG">LG</SelectItem>
                      <SelectItem value="Panasonic">Panasonic</SelectItem>
                      <SelectItem value="Philips">Philips</SelectItem>
                      <SelectItem value="Samsung">Samsung</SelectItem>
                      <SelectItem value="Tuya">Tuya</SelectItem>
                      <SelectItem value="Generic">Generic / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Pair your appliance in Android Bluetooth Settings first, then select it below.
                  </p>
                  <Button variant="outline" className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10" onClick={openBluetoothSettings}>
                    Open System Bluetooth Settings
                  </Button>
                  
                  <div className="flex items-center justify-between mt-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-foreground/80">Paired Devices</label>
                    <Button variant="ghost" size="sm" onClick={handleRefreshDevices} disabled={isScanning}>
                      {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-lg border border-border/40 p-2">
                    {scannedDevices.length === 0 ? (
                      <p className="text-xs text-center p-4 text-slate-500">No devices found. Click refresh.</p>
                    ) : (
                      scannedDevices.map(d => (
                        <div 
                          key={d.address}
                          onClick={() => setSelectedMac(d.address)}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${selectedMac === d.address ? 'bg-blue-500 text-white' : 'bg-secondary/10 hover:bg-slate-200 dark:hover:bg-white dark:bg-secondary/20'}`}
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
          )}

          {step === 5 && (
            <div className="flex flex-col gap-4">
              {deviceType === "light" && (
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-foreground/80">Lighting Capabilities</label>
                  <Select value={lightMode} onValueChange={(v) => setLightMode(v as any)}>
                    <SelectTrigger className="border-border/40 bg-secondary/10 focus:ring-blue-500">
                      <SelectValue placeholder="Select lighting options" />
                    </SelectTrigger>
                    <SelectContent className="border-border/40 bg-slate-50 dark:bg-[#181820] text-foreground">
                      <SelectItem value="normal">Standard (On/Off only)</SelectItem>
                      <SelectItem value="warm">Warm White Dimmable</SelectItem>
                      <SelectItem value="cool">Cool White Dimmable</SelectItem>
                      <SelectItem value="rgb+">RGB+ Full Color</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-foreground/80">Appliance Name</label>
                <Input
                  className="border-border/40 bg-secondary/10 focus:border-blue-500 focus:ring-blue-500 text-foreground placeholder:text-neutral-500"
                  placeholder={`e.g. ${brand} ${deviceType}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              {isPairing ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20 animate-pulse" />
                    <Loader2 className="relative h-12 w-12 animate-spin text-blue-500" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    {connectionType === "third-party" 
                      ? "Connecting via Bluetooth/WiFi protocol..." 
                      : "Searching for ELLY Direct signal..."}
                    <br/>
                    <span className="text-xs opacity-70">Please stay near the device.</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-green-500/20 p-4 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                    <Zap className="h-8 w-8" />
                  </div>
                  <p className="font-bold text-lg">Successfully paired!</p>
                </>
              )}
            </div>
          )}
        </div>

        {step < 6 && (
          <DialogFooter className="flex w-full justify-between sm:justify-between border-t border-border/20 pt-4 mt-2">
            <Button 
              variant="ghost" 
              onClick={handleBack} 
              disabled={step === 1 || (step === 2 && defaultRoomId !== undefined) || isScanning}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary/10"
            >
              Back
            </Button>
            {step < 5 ? (
              <Button 
                onClick={handleNext} 
                disabled={
                  (step === 1 && !roomId) || 
                  (step === 3 && !deviceType) || 
                  (step === 4 && connectionType !== 'third-party' && !brand) || (step === 4 && connectionType === 'third-party' && !selectedMac) ||
                  isScanning
                }
                className="bg-blue-500 hover:bg-blue-600 text-foreground font-semibold"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handlePairing}
                className="bg-blue-500 hover:bg-blue-600 text-foreground font-semibold shadow-[0_0_15px_rgba(59,130,246,0.4)]"
              >
                Start Pairing
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}