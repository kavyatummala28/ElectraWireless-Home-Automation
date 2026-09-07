import os
import re

def fix_light_mode_text():
    directories = [
        "D:/17_ElectraWireless_Elly_IoT/src/components",
        "D:/17_ElectraWireless_Elly_IoT/src/routes"
    ]
    
    # We want to replace `text-white` with `text-slate-900 dark:text-white`
    # EXCEPT when it is inside a button (bg-purple, bg-blue, bg-black, bg-[#111116], bg-neutral-900)
    
    for d in directories:
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith(".tsx") or file.endswith(".ts"):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    original_content = content
                    
                    # Manual fixes for common blocks:
                    content = content.replace('text-white', 'TEMP_TEXT_WHITE')
                    
                    # Restore buttons
                    content = content.replace('bg-blue-500 TEMP_TEXT_WHITE', 'bg-blue-500 text-white')
                    content = content.replace('bg-purple-500 TEMP_TEXT_WHITE', 'bg-purple-500 text-white')
                    content = content.replace('bg-orange-500 TEMP_TEXT_WHITE', 'bg-orange-500 text-white')
                    content = content.replace('bg-[#181820] TEMP_TEXT_WHITE', 'bg-[#181820] text-white')
                    content = content.replace('bg-neutral-800 TEMP_TEXT_WHITE', 'bg-neutral-800 text-white')
                    content = content.replace('bg-neutral-900 TEMP_TEXT_WHITE', 'bg-neutral-900 text-white')
                    content = content.replace('bg-slate-900 TEMP_TEXT_WHITE', 'bg-slate-900 text-white')
                    content = content.replace('bg-black TEMP_TEXT_WHITE', 'bg-black text-white')
                    
                    # Convert the rest
                    content = content.replace('TEMP_TEXT_WHITE', 'text-slate-900 dark:text-white')
                    
                    # Clean up any over-replacements
                    content = content.replace('text-slate-900 dark:text-slate-900 dark:text-white', 'text-slate-900 dark:text-white')
                    content = content.replace('dark:text-slate-900 dark:text-white', 'dark:text-white')
                    
                    if original_content != content:
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(content)
                            print(f"Patched light mode text: {filepath}")

if __name__ == "__main__":
    fix_light_mode_text()
