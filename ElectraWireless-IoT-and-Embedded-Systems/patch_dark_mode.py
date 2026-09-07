import os
import re

def fix_dark_mode():
    directories = [
        "D:/17_ElectraWireless_Elly_IoT/src/components",
        "D:/17_ElectraWireless_Elly_IoT/src/routes"
    ]
    
    for d in directories:
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith(".tsx") or file.endswith(".ts"):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    original_content = content
                    
                    # 1. Any standalone `text-slate-900` or `text-gray-900` inside classNames missing `dark:text-white`
                    content = re.sub(r'(text-slate-900)(?![\w\s]*dark:text-white)', r'\1 dark:text-white', content)
                    content = re.sub(r'(text-neutral-900)(?![\w\s]*dark:text-white)', r'\1 dark:text-white', content)
                    content = re.sub(r'(text-gray-900)(?![\w\s]*dark:text-white)', r'\1 dark:text-white', content)
                    
                    # 2. Text that was forced `text-white` but not on a colored background (like bg-blue, bg-purple, bg-black)
                    # We can target specific headings or paragraphs if they have `text-white` but no `text-slate-900`.
                    # Actually, a common issue was `text-white` on normal text elements.
                    # Let's search for `text-white` and if it's NOT accompanied by `bg-` (except bg-white or bg-transparent), we might want to change it to `text-slate-900 dark:text-white`.
                    # But it's safer to just do manual replacements for known areas.
                    
                    # Also, some cards have `bg-white` but miss `dark:bg-[#111116]`
                    content = re.sub(r'(bg-white)(?![\w\s]*dark:bg-)', r'\1 dark:bg-[#111116]', content)
                    
                    if original_content != content:
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(content)
                            print(f"Patched: {filepath}")

if __name__ == "__main__":
    fix_dark_mode()
