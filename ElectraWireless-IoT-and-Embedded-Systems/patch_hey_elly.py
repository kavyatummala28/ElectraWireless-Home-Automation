import re
import os

path = "src/hooks/useHeyElly.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

new_hook = """import { useEffect, useState, useRef } from 'react';
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
        const hasPermission = await SpeechRecognition.checkPermissions();
        if (hasPermission.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
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
              const transcript = result.matches[0].toLowerCase();
              console.log("Heard natively:", transcript);
              
              if (transcript.includes("hey elly") || transcript.includes("hi elly")) {
                let cmd = transcript.replace("hey elly", "").replace("hi elly", "").trim();
                toast.success("ELLY: I am awake!");
                if (onWakeWordRef.current) onWakeWordRef.current(cmd || undefined);
              }
            }
          } catch (e) {
            // Usually throws when no speech is detected after a timeout. Just loop.
          }
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
"""

# Replace the useHeyElly function
new_content = re.sub(
    r"export function useHeyElly.*?return \{ isListening \};\n\}",
    new_hook,
    content,
    flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
