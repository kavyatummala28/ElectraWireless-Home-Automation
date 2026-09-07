import os

def patch_tts():
    path = "D:/17_ElectraWireless_Elly_IoT/src/components/elly/EllyPortal.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # Add import
    code = code.replace('import { EllyLogo } from "./EllyLogo";', 
                        'import { EllyLogo } from "./EllyLogo";\nimport { TextToSpeech } from "@capacitor-community/text-to-speech";')

    old_speak = """  const speak = (s: string) => {
    if (!voiceReplies || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(s);
      u.rate = 1.02;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };"""
  
    new_speak = """  const speak = async (s: string) => {
    if (!voiceReplies) return;
    try {
      if (typeof window !== "undefined" && (window as any).cordova) {
        await TextToSpeech.stop();
        await TextToSpeech.speak({
          text: s,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
      } else if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(s);
        u.rate = 1.02;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
      }
    } catch {
      /* ignore */
    }
  };"""
  
    code = code.replace(old_speak, new_speak)
    
    # Also fix cleanup
    old_cleanup = """      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();"""
    new_cleanup = """      try {
        if (typeof window !== "undefined" && (window as any).cordova) {
          TextToSpeech.stop();
        } else if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}"""
      
    code = code.replace(old_cleanup, new_cleanup)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    patch_tts()
