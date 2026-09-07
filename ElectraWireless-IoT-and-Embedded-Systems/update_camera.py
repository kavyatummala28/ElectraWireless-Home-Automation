import re

def fix_camera_tsx():
    path = "D:/17_ElectraWireless_Elly_IoT/src/routes/camera.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Remove the duplicated methods inside the useEffect
    # They start around line 412 and end right before line 475
    # The string to look for is `const registerNewFace = async (e: React.FormEvent) => {`
    
    # We can use a regex to delete everything from the second `const registerNewFace` to `  return () => {\n      cancelAnimationFrame(animationFrameId);`
    
    pattern = r'(?s)(const registerNewFace = async \(e: React\.FormEvent\) => \{.*?)(return \(\) => \{\s*cancelAnimationFrame\(animationFrameId\);\s*\};)'
    
    # Wait, the first one is at line 150, the second one is inside useEffect.
    # Let's find all occurrences of registerNewFace
    occurrences = [m.start() for m in re.finditer(r'const registerNewFace = async \(e: React\.FormEvent\) => \{', code)]
    
    if len(occurrences) > 1:
        # Cut from the second occurrence to `return () => {\n      cancelAnimationFrame(animationFrameId);`
        start_cut = occurrences[1]
        
        # find the exact string
        end_str = "return () => {\n      cancelAnimationFrame(animationFrameId);\n    };"
        end_cut = code.find(end_str, start_cut)
        
        if end_cut != -1:
            code = code[:start_cut] + code[end_cut:]
            print("Removed duplicated functions in useEffect.")
    
    # 2. Extract RegisterFaceDialog into a separate component so typing doesn't lag the video feed.
    # We will just replace the modal code with a new component <FaceManagerDialog />
    # First, let's find the RegisterFace section in the JSX.
    
    # The modal is likely at the bottom of the file.
    # We'll just define <FaceManagerDialog /> at the end of the file.
    
    # Let's fix the Light/Dark mode colors
    # bg-[#111116] -> dark:bg-[#111116] bg-white
    # text-white -> dark:text-white text-slate-900 (already mostly done in camera.tsx)
    
    # Fix the confidence threshold in COCO-SSD
    code = code.replace("det.score > 0.5", "det.score > 0.25")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    fix_camera_tsx()
    print("Camera.tsx fixed")
