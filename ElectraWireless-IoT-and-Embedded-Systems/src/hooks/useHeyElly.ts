import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export function useHeyElly({ onWakeWord, pause }: { onWakeWord?: (cmd?: string) => void, pause?: boolean } = {}) {
  const [isListening, setIsListening] = useState(false);
  const isPausedRef = useRef(pause);
  const onWakeWordRef = useRef(onWakeWord);

  useEffect(() => {
    isPausedRef.current = pause;
    onWakeWordRef.current = onWakeWord;
  }, [pause, onWakeWord]);

  useEffect(() => {
    let active = true;
    
    const initSpeech = async () => {
      try {
        // Delay startup permission request to prevent Android Activity lifecycle crashes
        await new Promise(r => setTimeout(r, 2000));
        
        let hasPermission = await SpeechRecognition.checkPermissions();
        if (hasPermission.speechRecognition !== 'granted') {
          try {
            hasPermission = await SpeechRecognition.requestPermissions();
          } catch (err) {
            console.warn("Permission request failed or rejected", err);
          }
        }

        if (hasPermission.speechRecognition !== 'granted') {
           console.warn("Speech recognition permission not granted. Background listening disabled.");
           return;
        }

        const w = window as any;
        const WebSpeech = w.SpeechRecognition || w.webkitSpeechRecognition;

        if (WebSpeech && (!w.cordova || typeof w.cordova === 'undefined')) {
          // Web fallback
          const rec = new WebSpeech();
          rec.lang = 'en-US';
          rec.continuous = true;
          rec.interimResults = false;
          
          rec.onresult = (e: any) => {
            if (isPausedRef.current) return;
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
            console.log("Heard on web:", transcript);
            if (transcript) {
              if (onWakeWordRef.current) onWakeWordRef.current(transcript);
            }
          };

          rec.onend = () => {
            if (active && !isPausedRef.current) {
              setTimeout(() => rec.start(), 1000);
            } else {
              setIsListening(false);
            }
          };

          setIsListening(true);
          rec.start();
          
          return;
        }

        const available = await SpeechRecognition.available();
        if (!available.available) {
          console.warn("Native Speech Recognition not available.");
          return;
        }

        // We use a loop for continuous listening using the native plugin
        while (active) {
          if (isPausedRef.current) {
            setIsListening(false);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }

          setIsListening(true);
          try {
            const result = await SpeechRecognition.start({
              language: 'en-US',
              maxResults: 1,
              prompt: 'Listening...',
              partialResults: false,
              popup: false,
            });
            
            if (result.matches && result.matches.length > 0) {
              const transcript = result.matches[0].toLowerCase().trim();
              console.log("Heard natively:", transcript);
              
              if (transcript) {
                if (onWakeWordRef.current) onWakeWordRef.current(transcript);
              }
            }
          } catch (e) {
            // Usually throws when no speech is detected after a timeout. Just loop.
          }
          if (!active) break;
          await new Promise(r => setTimeout(r, 500)); // small delay before restarting
        }
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    };

    initSpeech();

    return () => {
      active = false;
      setIsListening(false);
      try {
        SpeechRecognition.stop();
      } catch(e) {}
    };
  }, []);

  return { isListening };
}


export async function enableBackgroundListening() {
  if (typeof window !== 'undefined' && 'Notification' in window && !(window as any).cordova) {
    try {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          toast.error("Notification permission required for background service.");
          return;
        }
      }
    } catch (e) {
      console.warn("Web Notification API failed:", e);
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
      // Small delay to ensure permissions are fully propagated in native layer
      setTimeout(() => {
        bgMode.enable();
        bgMode.disableWebViewOptimizations();
        bgMode.disableBatteryOptimizations();
        toast.success("Foreground Service Started! You can now close the app.");
      }, 500);
    } catch (err) {
      console.error(err);
      toast.error("Failed to start service. Check permissions.");
    }
  } else {
    toast.error("Background plugin not loaded. Ensure you are on a real Android phone.");
  }
}

export function disableBackgroundListening() {
  const bgMode = (window as any).cordova?.plugins?.backgroundMode;
  if (bgMode) {
    bgMode.disable();
    toast("Background Service Stopped.");
  }
}
