import { useEffect, useRef, useState } from "react";
import '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { createFileRoute } from "@tanstack/react-router";
import { Mic, Moon, ShieldCheck, Circle, Bell, CameraOff, RefreshCw, SwitchCamera, ListTree, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";
import { SciFiCard } from "@/components/ui/sci-fi-card";

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "Smart Vision, ELLY Home Automation" },
    ],
  }),
  component: CameraPage,
});

const events = [
  { time: "08:42", text: "Motion detected, front door" },
  { time: "07:15", text: "Person detected, living room" },
  { time: "23:50", text: "Night vision engaged" },
  { time: "22:03", text: "Recording started (event-based)" },
];

function CameraPage() {
  const { state, dispatch } = useHome();
  const active = state.cameraEnabled && !state.cameraPrivacy;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [talking, setTalking] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const detectionsListRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  
  // Custom Face Registration State
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const isRegisteringFaceRef = useRef(isRegisteringFace);
  
  useEffect(() => {
    isRegisteringFaceRef.current = isRegisteringFace;
  }, [isRegisteringFace]);

    const [scanProgress, setScanProgress] = useState(0);
  const [customFaces, setCustomFaces] = useState<{ id: string, name: string, embeddings: Float32Array[] }[]>([]);
  const customFacesRef = useRef(customFaces);
  useEffect(() => { customFacesRef.current = customFaces; }, [customFaces]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const toggleTalk = async () => {
    if (talking) {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      setTalking(false);
      toast("Two-way audio closed");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone is not supported on this device.");
      return;
    }
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setTalking(true);
      toast.success("Two-way audio open, speak now");
    } catch {
      toast.error("Microphone permission denied.");
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setTalking(false);
  };

  const startStream = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCamError("This device or browser does not support camera access.");
      return;
    }
    setStarting(true);
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setCamError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow access in your browser to view the live feed."
          : "Could not access a camera on this device.",
      );
    } finally {
      setStarting(false);
    }
  };

  // Real Edge AI Detections using MobileNet
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [objectDetector, setObjectDetector] = useState<cocoSsd.ObjectDetection | null>(null);
  const [snehalEmbeddings, setSnehalEmbeddings] = useState<Float32Array[]>([]);
  const [prediction, setPrediction] = useState<{ className: string; probability: number } | null>(null);

  // Load custom faces & models on component mount
  useEffect(() => {
    let isMounted = true;
    
    // Load custom faces
    const saved = localStorage.getItem("elly_registered_faces");
    const loadedFaces: { id: string, name: string, embeddings: Float32Array[] }[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const faces = parsed.map((f: any) => ({
          ...f,
          embeddings: f.embeddings.map((e: number[]) => new Float32Array(e))
        }));
        loadedFaces.push(...faces);
      } catch(e) {}
    }

    Promise.all([mobilenet.load(), cocoSsd.load()]).then(async ([m, objDetector]) => {
      if (!isMounted) return;
      setModel(m);
      setObjectDetector(objDetector);
      setCustomFaces(loadedFaces);
    });
    return () => { isMounted = false; };
  }, []);
  
  const registerNewFace = async (nameToRegister: string) => {
    if (!nameToRegister.trim() || !model || !videoRef.current) return;
    const newUserName = nameToRegister;
    
    const embeddings: Float32Array[] = [];
    setScanProgress(10);
    
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 300));
      if (!videoRef.current) break;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = videoRef.current.videoWidth;
      cropCanvas.height = videoRef.current.videoHeight;
      const ctx = cropCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const activation = model.infer(cropCanvas, true);
        embeddings.push(activation.dataSync() as Float32Array);
        activation.dispose();
      }
      setScanProgress(10 + (i+1)*9);
    }

    const newFace = {
      id: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      name: newUserName.trim(),
      embeddings
    };

    const updatedFaces = [...customFaces, newFace];
    setCustomFaces(updatedFaces);
    
    const serializable = updatedFaces.map(f => ({
      ...f,
      embeddings: f.embeddings.map(e => Array.from(e))
    }));
    localStorage.setItem("elly_registered_faces", JSON.stringify(serializable));
    
    toast.success(`User ${newFace.name} registered with Elly ID #${newFace.id}`);
    setIsRegisteringFace(false);
    setNewUserName("");
    setScanProgress(0);
  };


  const deleteFace = (id: string) => {
    const updatedFaces = customFaces.filter(f => f.id !== id);
    setCustomFaces(updatedFaces);
    const serializable = updatedFaces.map(f => ({
      ...f,
      embeddings: f.embeddings.map(e => Array.from(e))
    }));
    localStorage.setItem("elly_registered_faces", JSON.stringify(serializable));
    toast.success("Face removed");
  };

  const clearDatabase = () => {
    localStorage.removeItem("elly_registered_faces");
    setCustomFaces([]);
    toast.success("Face Database Wiped");
    setIsRegisteringFace(false);
  };

  // Run classification loop when camera is active and model is loaded
  useEffect(() => {
    if (!active || !model || !videoRef.current) {
      setPrediction(null);
      return;
    }
    
    let animationFrameId: number;
    let lastLogTime = 0;

    const detectFrame = async () => {
      if (isRegisteringFaceRef.current) {
        // Pause all heavy AI processing while typing/registering to fix lag
        await new Promise(r => setTimeout(r, 500));
        animationFrameId = requestAnimationFrame(detectFrame);
        return;
      }

      if (videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current && objectDetector) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        const ctx = canvas.getContext('2d');
        let currentDetectionsHtml = "";
        
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          const displayWidth = video.clientWidth;
          const displayHeight = video.clientHeight;

          const scaleX = displayWidth / videoWidth;
          const scaleY = displayHeight / videoHeight;
          const scale = Math.max(scaleX, scaleY);
          const offsetX = (displayWidth - videoWidth * scale) / 2;
          const offsetY = (displayHeight - videoHeight * scale) / 2;

          
          const detections = await objectDetector.detect(video);

          
          for (const det of detections) {
            let label = det.class;
            
            const [x, y, width, height] = det.bbox;
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = width;
            cropCanvas.height = height;
            const cropCtx = cropCanvas.getContext('2d');
            
            if (cropCtx && det.score > 0.25) {
              cropCtx.drawImage(video, x, y, width, height, 0, 0, width, height);
              
              try {
                const predictions = await model.classify(cropCanvas);
                if (predictions && predictions.length > 0) {
                  const mobileNetClass = predictions[0].className.split(',')[0].toLowerCase();
                  const isHumanClothing = ["suit", "t-shirt", "jersey", "sweatshirt", "cardigan", "jean", "wig", "sunglasses", "seat belt", "neck brace", "bow tie", "mask", "abaya", "academic gown", "apron", "bathing cap", "bikini", "brassiere", "cowboy hat", "crash helmet", "fur coat", "gown", "lab coat", "miniskirt", "overskirt", "pajama", "poncho", "shower cap", "ski mask", "sombrero", "stole", "swimming trunks", "trench coat", "vest", "nipple", "face powder", "hair spray", "lipstick", "lotion", "perfume", "stethoscope"].some(c => mobileNetClass.includes(c));

                  if (det.class === "person") {
                    if (customFacesRef.current.length > 0) {
                      const activation = model.infer(cropCanvas, true);
                      const data = activation.dataSync() as Float32Array;
                      activation.dispose();

                      let bestMatch = null;
                      let highestSim = 0;

                      for (const face of customFacesRef.current) {
                        for (const emb of face.embeddings) {
                          let dotProduct = 0, normA = 0, normB = 0;
                          for (let i = 0; i < data.length; i++) {
                            dotProduct += data[i] * emb[i];
                            normA += data[i] * data[i];
                            normB += emb[i] * emb[i];
                          }
                          const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                          if (sim > highestSim) {
                            highestSim = sim;
                            bestMatch = face;
                          }
                        }
                      }

                      if (highestSim > 0.65 && bestMatch) {
                        label = `${bestMatch.name} (${Math.round(highestSim * 100)}%)`;
                      } else {
                        // Just label as person instead of unknown person to avoid confusion when it's a hand
                        label = "Person";
                      }
                    } else {
                      label = "Person";
                    }
                  } else {
                    // Not a person, just use the CocoSSD label directly to avoid MobileNet hallucinating on tiny crops
                    label = det.class.charAt(0).toUpperCase() + det.class.slice(1);
                  }
                }
              } catch (e) {}
            }
            
            const drawX = x * scale + offsetX;
            const drawY = y * scale + offsetY;
            const drawW = width * scale;
            const drawH = height * scale;

            // Sci-Fi HUD Box Styling
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
            ctx.lineWidth = 2;
            const cornerL = 15;
            ctx.beginPath();
            // Top left
            ctx.moveTo(drawX, drawY + cornerL); ctx.lineTo(drawX, drawY); ctx.lineTo(drawX + cornerL, drawY);
            // Top right
            ctx.moveTo(drawX + drawW - cornerL, drawY); ctx.lineTo(drawX + drawW, drawY); ctx.lineTo(drawX + drawW, drawY + cornerL);
            // Bottom left
            ctx.moveTo(drawX, drawY + drawH - cornerL); ctx.lineTo(drawX, drawY + drawH); ctx.lineTo(drawX + cornerL, drawY + drawH);
            // Bottom right
            ctx.moveTo(drawX + drawW - cornerL, drawY + drawH); ctx.lineTo(drawX + drawW, drawY + drawH); ctx.lineTo(drawX + drawW, drawY + drawH - cornerL);
            ctx.stroke();

            // Glassmorphism label background
            ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
            ctx.fillRect(drawX, drawY, drawW, drawH);

            ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
            const textWidth = ctx.measureText(label.toUpperCase()).width;
            ctx.fillRect(drawX, drawY - 24, textWidth + 16, 24);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(label.toUpperCase(), drawX + 8, drawY - 7);

            // Add to live detections overlay
            const scorePercent = Math.round((det.score > 0.25 ? det.score : 0.5) * 100);
            currentDetectionsHtml += `
              <div class="flex justify-between items-center bg-[#a855f7]/10 border border-[#a855f7]/30 px-3 py-1.5 rounded-lg mb-2 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                <span class="text-xs font-bold text-foreground tracking-wider">${label.toUpperCase()}</span>
                <span class="text-[10px] font-mono text-[#a855f7] bg-[#a855f7]/20 px-1.5 py-0.5 rounded">${scorePercent}%</span>
              </div>
            `;

            const now = Date.now();
            if (det.score > 0.7 && now - lastLogTime > 15000) {
              dispatch({ 
                type: "LOG", 
                entry: { 
                  id: now.toString(), 
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
                  source: "system", 
                  text: `Vision AI: High confidence match - ${label}` 
                } 
              });

              // Vision Automation
              if (label.includes("Snehal") && det.score > 0.6) {
                const light = stateRef.current.devices.find(d => d.type === "light");
                if (light && !light.on) {
                  dispatch({ type: "UPDATE_DEVICE", id: light.id, patch: { on: true } });
                  toast.success(`Vision AI: Recognized Snehal! Turning on ${light.name}.`);
                }
              }

              lastLogTime = now;
            }
          }
          
          if (detectionsListRef.current) {
            detectionsListRef.current.innerHTML = currentDetectionsHtml;
          }
        }
      }
      
      // Throttle the detection loop by 100ms to free up the CPU thread for UI typing
      await new Promise(r => setTimeout(r, 100));
      animationFrameId = requestAnimationFrame(detectFrame);
    };

    detectFrame();

  
  return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, model, objectDetector, snehalEmbeddings, dispatch]);

  useEffect(() => {
    if (active) startStream();
    else stopStream();
  

  return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, facingMode]);


  return (
    <div className="bg-slate-50 dark:bg-black flex-1 text-foreground pb-6 -mx-4 px-4 sm:-mx-8 sm:px-8 flex flex-col">
      <div className="mx-auto max-w-4xl w-full space-y-6 pt-2">
        {!state.cameraEnabled && (
          <SciFiCard color="blue" className="flex flex-col items-center gap-4 p-8 text-center">
            <ShieldCheck className="h-10 w-10 text-blue-400" />
            <p className="text-[15px] font-medium text-muted-foreground">
              Camera access requires your explicit consent. Enable to view live feed and alerts.
            </p>
            <button
              className="rounded-full bg-blue-500 hover:bg-blue-600 px-6 py-2.5 text-sm font-bold text-foreground shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all"
              onClick={() => {
                dispatch({
                  type: "PATCH_CAMERA",
                  patch: { cameraEnabled: true, cameraPrivacy: false },
                });
                toast.success("Camera consent granted");
              }}
            >
              Grant camera consent
            </button>
          </SciFiCard>
        )}

        {/* Live feed */}
        <SciFiCard color={state.cameraRecording ? "fuchsia" : "blue"} className="rounded-[2rem] shadow-2xl">
          <div className="relative flex aspect-video items-center justify-center bg-black text-foreground">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={active && !camError ? "h-full w-full object-cover" : "hidden"}
            />
            <canvas
              ref={canvasRef}
              className={active && !camError ? "absolute inset-0 h-full w-full pointer-events-none z-10" : "hidden"}
            />

            {active && !camError && (
              <>
                <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-foreground shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10">
                  <Circle className="h-2 w-2 animate-pulse fill-current" /> LIVE
                </span>
                {state.cameraRecording && (
                  <span className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-foreground z-10">
                    <Circle className="h-2 w-2 animate-pulse fill-red-500 text-red-500" /> REC
                  </span>
                )}
                {!model && (
                  <span className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-border/40 px-4 py-2 rounded-[1.5rem] text-[13px] font-bold text-foreground tracking-wide z-10 shadow-lg">
                    Loading AI Model...
                  </span>
                )}
              </>
            )}

            {!active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-[#181820]/90 backdrop-blur-md z-20">
                <CameraOff className="h-10 w-10 text-foreground/50" />
                <p className="font-bold text-foreground/50">Camera Paused</p>
              </div>
            )}
            {starting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-[#181820]/90 backdrop-blur-md z-20">
                <RefreshCw className="h-10 w-10 animate-spin text-purple-400" />
                <p className="font-bold text-purple-400">Initializing Vision Engine...</p>
              </div>
            )}
            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-destructive/10 px-8 text-center text-destructive z-20">
                <ShieldCheck className="h-10 w-10" />
                <p className="text-sm font-medium">{camError}</p>
              </div>
            )}
          </div>
          
          {/* Action Bar below camera */}
          <div className="flex items-center justify-between border-t border-border/20 bg-slate-50 dark:bg-[#181820] p-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full shadow-[0_0_10px_currentColor] transition-colors ${
                  active && !camError && !starting ? "bg-purple-500" : "bg-secondary/70"
                }`}
              />
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">
                {active && !camError && !starting ? "Vision AI Active" : "Standby"}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                disabled={!active || starting}
                onClick={() => setFacingMode(f => f === "environment" ? "user" : "environment")}
                className="flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                <SwitchCamera className="h-4 w-4" />
                FLIP
              </button>
              <button
                disabled={!active || starting || !model}
                onClick={() => setIsRegisteringFace(true)}
                className="flex items-center gap-2 rounded-full bg-purple-500/20 px-4 py-2 text-xs font-bold text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </button>
            </div>
          </div>
          
          {/* Live Detections Sidebar/List */}
          {active && !camError && !starting && (
            <div className="border-t border-purple-200 dark:border-purple-500/20 bg-white/40 dark:bg-purple-950/20 backdrop-blur-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListTree className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Active Tracking</p>
              </div>
              <div ref={detectionsListRef} className="space-y-1 min-h-[40px]">
                {/* Dynamically injected by requestAnimationFrame */}
              </div>
            </div>
          )}
        </SciFiCard>

        {/* Controls Grid */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => dispatch({ type: "PATCH_CAMERA", patch: { cameraPrivacy: !state.cameraPrivacy } })}
            disabled={!state.cameraEnabled}
            className="flex flex-col items-center justify-center gap-3 py-5 px-2 rounded-[1.5rem] border border-purple-200 dark:border-purple-500/25 glass-card transition-all hover:bg-white/60 dark:hover:bg-purple-900/40 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm group"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-transform group-hover:scale-105 ${state.cameraPrivacy ? "bg-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-secondary/50"}`}>
              <Moon className="h-6 w-6" />
            </span>
            <span className="font-semibold text-foreground text-[13px]">Privacy</span>
          </button>
          
          <button
            onClick={() => dispatch({ type: "PATCH_CAMERA", patch: { cameraMotionAlerts: !state.cameraMotionAlerts } })}
            disabled={!active}
            className="flex flex-col items-center justify-center gap-3 py-5 px-2 rounded-[1.5rem] border border-purple-200 dark:border-purple-500/25 glass-card transition-all hover:bg-white/60 dark:hover:bg-purple-900/40 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm group"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-transform group-hover:scale-105 ${state.cameraMotionAlerts ? "bg-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-secondary/50"}`}>
              <Bell className="h-6 w-6" />
            </span>
            <span className="font-semibold text-foreground text-[13px]">Alerts</span>
          </button>
          
          <button
            onClick={() => dispatch({ type: "PATCH_CAMERA", patch: { cameraRecording: !state.cameraRecording } })}
            disabled={!active}
            className="flex flex-col items-center justify-center gap-3 py-5 px-2 rounded-[1.5rem] border border-purple-200 dark:border-purple-500/25 glass-card transition-all hover:bg-white/60 dark:hover:bg-purple-900/40 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm group"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-transform group-hover:scale-105 ${state.cameraRecording ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]" : "bg-secondary/50"}`}>
              <Circle className="h-6 w-6" />
            </span>
            <span className="font-semibold text-foreground text-[13px]">Record</span>
          </button>

          <button
            onClick={toggleTalk}
            disabled={!active}
            className="flex flex-col items-center justify-center gap-3 py-5 px-2 rounded-[1.5rem] border border-purple-200 dark:border-purple-500/25 glass-card transition-all hover:bg-white/60 dark:hover:bg-purple-900/40 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm group col-span-2"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-transform group-hover:scale-105 ${talking ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" : "bg-secondary/50"}`}>
              <Mic className="h-6 w-6" />
            </span>
            <span className="font-semibold text-foreground text-[13px]">{talking ? "Speaking..." : "Talk"}</span>
          </button>

          <button
            disabled={!active}
            className="flex flex-col items-center justify-center gap-3 py-5 px-2 rounded-[1.5rem] border border-purple-200 dark:border-purple-500/25 glass-card transition-all hover:bg-white/60 dark:hover:bg-purple-900/40 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm group"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-transform group-hover:scale-105 ${active ? "bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.4)]" : "bg-secondary/50"}`}>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-foreground">Auto</span>
            </span>
            <span className="font-semibold text-foreground text-[13px]">Night</span>
          </button>
        </div>

        <SciFiCard color="violet" className="p-7">
          <h2 className="mb-5 text-lg font-bold text-foreground">Event History</h2>
          <div className="space-y-4">
            {events.map((e) => (
              <div key={e.time} className="flex items-center gap-4">
                <span className="font-mono text-sm font-bold text-muted-foreground">{e.time}</span>
                <span className="text-[15px] font-medium text-foreground">{e.text}</span>
              </div>
            ))}
          </div>
        </SciFiCard>
      </div>

      {/* Face Registration Modal */}
      {isRegisteringFace && (
          <FaceManagerDialog 
            onClose={() => setIsRegisteringFace(false)}
            onRegister={registerNewFace}
            scanProgress={scanProgress}
            customFaces={customFaces}
            onDeleteFace={deleteFace}
            onClearDatabase={clearDatabase}
          />
        )}
    </div>
  );
}

interface FaceManagerProps {
  onClose: () => void;
  onRegister: (name: string) => void;
  scanProgress: number;
  customFaces: any[];
  onDeleteFace: (id: string) => void;
  onClearDatabase: () => void;
}

function FaceManagerDialog({ 
  onClose, 
  onRegister, 
  scanProgress, 
  customFaces, 
  onDeleteFace, 
  onClearDatabase 
}: FaceManagerProps) {
  const [localName, setLocalName] = useState("");
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 max-w-md mx-auto">
      <div className="w-full max-w-sm rounded-[2rem] bg-white dark:bg-card p-6 shadow-2xl border border-border/40">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-400" /> Face Management
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onRegister(localName); }} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Person's Name</label>
            <input 
              type="text" 
              placeholder="e.g. Adil Sukumar"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="mt-1 w-full rounded-[1rem] border border-border/40 bg-slate-50 dark:bg-secondary/10 px-4 py-3 text-foreground placeholder:text-slate-400 dark:placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            />
          </div>

          {scanProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-foreground/50">
                <span>Scanning...</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!localName.trim() || scanProgress > 0}
            className="w-full rounded-[1rem] bg-purple-600 px-4 py-3 font-bold text-foreground transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {scanProgress > 0 ? "Scanning..." : "Start Scan"}
          </button>
          
          {customFaces.length > 0 && (
            <div className="mt-4 border-t border-border/40 pt-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Registered Users</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {customFaces.map((face) => (
                  <div key={face.id} className="flex justify-between items-center bg-secondary/10 border border-border/40 rounded-lg p-2 px-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{face.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">ID: #{face.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteFace(face.id)}
                      className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClearDatabase}
            className="w-full rounded-[1rem] bg-red-500/20 px-4 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/30 mt-4"
          >
            Wipe All Data
          </button>
        </form>
      </div>
    </div>
  );
}
