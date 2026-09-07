import os

# 1. Fix Camera.tsx Closure Bug
camera_path = "D:/17_ElectraWireless_Elly_IoT/src/routes/camera.tsx"
with open(camera_path, "r", encoding="utf-8") as f:
    camera_code = f.read()

ref_injection = """  const [customFaces, setCustomFaces] = useState<{ id: string, name: string, embeddings: Float32Array[] }[]>([]);
  const customFacesRef = useRef(customFaces);
  useEffect(() => { customFacesRef.current = customFaces; }, [customFaces]);"""

camera_code = camera_code.replace('  const [customFaces, setCustomFaces] = useState<{ id: string, name: string, embeddings: Float32Array[] }[]>([]);', ref_injection)

# Replace usage inside the detectFrame
camera_code = camera_code.replace('if (customFaces.length > 0) {', 'if (customFacesRef.current.length > 0) {')
camera_code = camera_code.replace('for (const face of customFaces) {', 'for (const face of customFacesRef.current) {')

with open(camera_path, "w", encoding="utf-8") as f:
    f.write(camera_code)
print("Fixed camera.tsx closure bug.")

# 2. Fix useHeyElly.ts Crash on Android 13+
hey_elly_path = "D:/17_ElectraWireless_Elly_IoT/src/hooks/useHeyElly.ts"
with open(hey_elly_path, "r", encoding="utf-8") as f:
    hey_elly_code = f.read()

bg_listening_fix = """export async function enableBackgroundListening() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
  }
  
  const bgMode = (window as any).cordova?.plugins?.backgroundMode;
  if (bgMode) {
    try {
      bgMode.setDefaults({
          title: 'Elly AI Background Service',
          text: 'Listening for "Hey Elly"... (Tap to open app)',
          icon: 'ic_launcher',
          color: 'A855F7',
          resume: true,
          hidden: false,
          bigText: true
      });
      bgMode.enable();
      bgMode.disableWebViewOptimizations();
      bgMode.disableBatteryOptimizations();
      toast.success("Foreground Service Started! You can now close the app.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to start service. Check permissions.");
    }
  } else {
    toast.error("Background plugin not loaded. Ensure you are on a real Android phone.");
  }
}"""

hey_elly_code = hey_elly_code.replace("export function enableBackgroundListening() {\n  const bgMode = (window as any).cordova?.plugins?.backgroundMode;\n  if (bgMode) {\n    bgMode.setDefaults({\n        title: 'Elly AI Background Service',\n        text: 'Listening for \"Hey Elly\"... (Tap to open app)',\n        icon: 'ic_launcher',\n        color: 'A855F7',\n        resume: true,\n        hidden: false,\n        bigText: true\n    });\n    bgMode.enable();\n    bgMode.disableWebViewOptimizations();\n    \n    // Optional: Ask user to disable battery optimizations\n    bgMode.disableBatteryOptimizations();\n    toast.success(\"Foreground Service Started! You can now close the app.\");\n  } else {\n    toast.error(\"Background plugin not loaded. Ensure you are on a real Android phone.\");\n  }\n}", bg_listening_fix)

with open(hey_elly_path, "w", encoding="utf-8") as f:
    f.write(hey_elly_code)
print("Fixed useHeyElly.ts Android 13 crash.")
