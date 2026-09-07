import re

path = "src/components/elly/EllyPortal.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure SpeechRecognition is imported
if "import { SpeechRecognition } from \"@capacitor-community/speech-recognition\";" not in content:
    content = content.replace(
        "import { TextToSpeech } from \"@capacitor-community/text-to-speech\";",
        "import { TextToSpeech } from \"@capacitor-community/text-to-speech\";\nimport { SpeechRecognition } from \"@capacitor-community/speech-recognition\";"
    )

new_start_listening = """
  const startListening = async () => {
    setHeard("");
    setListening(true);
    try {
      if (typeof window !== "undefined" && (window as any).cordova) {
        const hasPermission = await SpeechRecognition.checkPermissions();
        if (hasPermission.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }
        
        const result = await SpeechRecognition.start({
          language: 'en-US',
          maxResults: 1,
          prompt: 'Listening...',
          partialResults: true,
          popup: true,
        });
        
        setListening(false);
        if (result.matches && result.matches.length > 0) {
          const transcript = result.matches[0];
          setHeard(transcript);
          sendMessage(transcript);
        }
      } else {
        // Fallback for web preview
        const w = window as any;
        const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!Ctor) return;
        const rec = new Ctor();
        rec.lang = "en-US";
        rec.continuous = false;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
          const transcript = Array.from({ length: e.results.length })
            .map((_, i) => e.results[i][0].transcript)
            .join(" ");
          setHeard(transcript);
        };
        rec.onend = () => {
          setListening(false);
          setHeard((current) => {
            if (current.trim()) sendMessage(current.trim());
            return "";
          });
        };
        rec.onerror = () => setListening(false);
        recognitionRef.current = rec;
        rec.start();
      }
    } catch (e) {
      setListening(false);
    }
  };

  const stopListening = () => {
    setListening(false);
    try {
      if (typeof window !== "undefined" && (window as any).cordova) {
        SpeechRecognition.stop();
      } else {
        recognitionRef.current?.stop();
      }
    } catch {
      /* ignore */
    }
  };
"""

# Replace the startListening and stopListening functions
content = re.sub(
    r"const stopListening = \(\) => \{.*?\};.*?const startListening = \(\) => \{.*?\};",
    new_start_listening.strip(),
    content,
    flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
