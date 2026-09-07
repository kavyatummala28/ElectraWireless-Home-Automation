import os
import re

directories = ['src/routes', 'src/components']

replacements = {
    r'bg-neutral-800/50': 'bg-secondary/50',
    r'bg-neutral-800/40': 'bg-secondary/40',
    r'bg-neutral-800/80': 'bg-secondary/80',
    r'bg-neutral-800': 'bg-secondary',
    r'bg-neutral-700': 'bg-secondary/80',
    r'bg-neutral-600': 'bg-secondary/70',
    r'text-neutral-400': 'text-muted-foreground',
    r'text-neutral-300': 'text-muted-foreground',
    r'bg-slate-100 dark:bg-black': 'bg-card',
    r'bg-slate-100 dark:bg-white dark:bg-secondary/10': 'bg-secondary/10',
    r'bg-slate-200 dark:bg-white dark:bg-secondary/20': 'bg-secondary/20',
    r'bg-slate-100 dark:bg-secondary/10': 'bg-secondary/10',
    r'bg-slate-200 dark:bg-white/5': 'bg-secondary/10',
    r'bg-slate-300 dark:hover:bg-white/10': 'hover:bg-secondary/20',
    r'bg-slate-200 dark:bg-\[\#181820\]': 'bg-secondary',
    r'border-slate-200 dark:border-border/20': 'border-border/20',
    r'border-slate-200 dark:border-border/40': 'border-border/40',
    r'border-slate-300 dark:border-border/40': 'border-border/40',
    r'bg-slate-100': 'bg-secondary/10',
    r'rounded-2xl': 'rounded-[1.5rem]',
    r'rounded-3xl': 'rounded-[2rem]',
    r'rounded-xl': 'rounded-[1rem]',
}

for root, dirs, files in os.walk('D:/17_ElectraWireless_Elly_IoT/'):
    if not any(d in root for d in directories):
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file}")
