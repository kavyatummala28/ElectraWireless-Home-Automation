import os
import glob

def fix_tailwind_styles():
    tsx_files = glob.glob('D:/17_ElectraWireless_Elly_IoT/src/**/*.tsx', recursive=True)
    
    for path in tsx_files:
        with open(path, "r", encoding="utf-8") as f:
            code = f.read()

        # Simple string replacements for common hardcoded dark mode colors
        
        # 1. Backgrounds
        # Only replace exact matches or when it's inside className strings
        # e.g., bg-[#111116] -> dark:bg-[#111116] bg-white
        # But wait, we shouldn't replace if it already has `dark:` prefix.
        
        # We can use regex to safely replace
        import re
        
        # replace bg-[#111116] not preceded by dark:
        code = re.sub(r'(?<!dark:)bg-\[\#111116\]', 'bg-white dark:bg-[#111116]', code)
        
        # replace bg-black not preceded by dark: (only some places, be careful. The root layout needs bg-black -> bg-slate-50 dark:bg-black)
        code = re.sub(r'(?<!dark:)bg-black( flex-1)', r'bg-slate-50 dark:bg-black\1', code)
        code = re.sub(r'(?<!dark:)bg-black( min-h-screen)', r'bg-slate-50 dark:bg-black\1', code)

        # 2. Text colors
        # text-white not preceded by dark: -> text-slate-900 dark:text-white
        # but avoid replacing in active states like `active ? "text-white" : "text-black"`
        # Actually, replacing all `text-white` not preceded by `dark:` in static strings might be risky, 
        # but it's exactly what Light Mode needs.
        # Wait! If text-white is inside a button (e.g. bg-blue-500 text-white), we DONT want dark:text-white text-slate-900.
        # Let's only target text-white when it's associated with bg-[#111116] or bg-black.
        # It's better to just write specific replacements for device.$deviceId.tsx and DeviceTile.tsx
        
        if "device.$deviceId.tsx" in path or "DeviceTile.tsx" in path or "Layout.tsx" in path:
            code = code.replace('text-white', 'text-slate-900 dark:text-white')
            # Fix any double darks created
            code = code.replace('text-slate-900 dark:text-slate-900 dark:text-white', 'text-slate-900 dark:text-white')
            code = code.replace('dark:dark:', 'dark:')
            
            # Revert text-white on primary buttons (bg-blue-500, bg-orange-500, bg-red-500, bg-purple-500)
            code = code.replace('bg-blue-500 text-slate-900 dark:text-white', 'bg-blue-500 text-white')
            code = code.replace('bg-orange-500 text-slate-900 dark:text-white', 'bg-orange-500 text-white')
            code = code.replace('bg-red-500 text-slate-900 dark:text-white', 'bg-red-500 text-white')
            code = code.replace('bg-purple-500 text-slate-900 dark:text-white', 'bg-purple-500 text-white')
            code = code.replace('bg-orange-500 hover:bg-orange-600 text-slate-900 dark:text-white', 'bg-orange-500 hover:bg-orange-600 text-white')
            code = code.replace('bg-red-500 hover:bg-red-600 text-slate-900 dark:text-white', 'bg-red-500 hover:bg-red-600 text-white')
            
        with open(path, "w", encoding="utf-8") as f:
            f.write(code)

if __name__ == "__main__":
    fix_tailwind_styles()
    print("Tailwind styles fixed")
