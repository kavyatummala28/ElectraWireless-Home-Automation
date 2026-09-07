import os

def patch_voice():
    # 1. Update useHeyElly.ts
    path1 = "D:/17_ElectraWireless_Elly_IoT/src/hooks/useHeyElly.ts"
    with open(path1, "r", encoding="utf-8") as f:
        code1 = f.read()
    
    old_wake = """export function useHeyElly({ onWakeWord, pause }: { onWakeWord?: () => void, pause?: boolean } = {}) {"""
    new_wake = """export function useHeyElly({ onWakeWord, pause }: { onWakeWord?: (cmd?: string) => void, pause?: boolean } = {}) {"""
    code1 = code1.replace(old_wake, new_wake)
    
    old_result = """      if (transcript.includes("hey elly") || transcript.includes("hi elly")) {
        toast.success("ELLY: I am awake! How can I help you?");
        if (onWakeWord) onWakeWord();
      }"""
    new_result = """      if (transcript.includes("hey elly") || transcript.includes("hi elly")) {
        let cmd = transcript.replace("hey elly", "").replace("hi elly", "").trim();
        toast.success("ELLY: I am awake!");
        if (onWakeWord) onWakeWord(cmd || undefined);
      }"""
    code1 = code1.replace(old_result, new_result)
    with open(path1, "w", encoding="utf-8") as f:
        f.write(code1)

    # 2. Update EllyContext.tsx
    path2 = "D:/17_ElectraWireless_Elly_IoT/src/components/elly/EllyContext.tsx"
    with open(path2, "r", encoding="utf-8") as f:
        code2 = f.read()
        
    code2 = code2.replace('type EllyCtx = { open: boolean; openElly: () => void; closeElly: () => void };', 
                          'type EllyCtx = { open: boolean; openElly: (cmd?: string) => void; closeElly: () => void };')
    
    code2 = code2.replace('const [open, setOpen] = useState(false);', 
                          'const [open, setOpen] = useState(false);\n  const [initialCmd, setInitialCmd] = useState<string | undefined>();')
    
    code2 = code2.replace('openElly: () => setOpen(true)', 
                          'openElly: (cmd) => { setInitialCmd(cmd); setOpen(true); }')
                          
    code2 = code2.replace('<EllyPortal open={open} onClose={() => setOpen(false)} />',
                          '<EllyPortal open={open} onClose={() => setOpen(false)} initialCmd={initialCmd} />')
                          
    with open(path2, "w", encoding="utf-8") as f:
        f.write(code2)
        
    # 3. Update EllyPortal.tsx
    path3 = "D:/17_ElectraWireless_Elly_IoT/src/components/elly/EllyPortal.tsx"
    with open(path3, "r", encoding="utf-8") as f:
        code3 = f.read()
        
    code3 = code3.replace('export function EllyPortal({ open, onClose }: { open: boolean; onClose: () => void }) {',
                          'export function EllyPortal({ open, onClose, initialCmd }: { open: boolean; onClose: () => void; initialCmd?: string }) {')
    
    old_effect = """  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);"""
  
    new_effect = """  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Process initial command if woken with one
  useEffect(() => {
    if (open && initialCmd) {
      // Small delay to let UI render before sending
      setTimeout(() => sendMessage(initialCmd), 500);
    } else if (open && !initialCmd && !listening) {
      // If opened with just "Hey Elly", start listening automatically
      startListening();
    }
  }, [open, initialCmd]);"""
  
    code3 = code3.replace(old_effect, new_effect)
    with open(path3, "w", encoding="utf-8") as f:
        f.write(code3)

if __name__ == "__main__":
    patch_voice()
    print("Voice patches applied")
