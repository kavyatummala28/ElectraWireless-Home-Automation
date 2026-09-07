const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
    [/bg-neutral-800\/50/g, 'bg-secondary/50'],
    [/bg-neutral-800\/40/g, 'bg-secondary/40'],
    [/bg-neutral-800\/80/g, 'bg-secondary/80'],
    [/bg-neutral-800/g, 'bg-secondary'],
    [/bg-neutral-700/g, 'bg-secondary/80'],
    [/bg-neutral-600/g, 'bg-secondary/70'],
    [/text-neutral-400/g, 'text-muted-foreground'],
    [/text-neutral-300/g, 'text-muted-foreground'],
    [/bg-slate-100 dark:bg-black/g, 'bg-card'],
    [/bg-slate-100 dark:bg-white dark:bg-secondary\/10/g, 'bg-secondary/10'],
    [/bg-slate-200 dark:bg-white dark:bg-secondary\/20/g, 'bg-secondary/20'],
    [/bg-slate-100 dark:bg-secondary\/10/g, 'bg-secondary/10'],
    [/bg-slate-200 dark:bg-white\/5/g, 'bg-secondary/10'],
    [/bg-slate-300 dark:hover:bg-white\/10/g, 'hover:bg-secondary/20'],
    [/bg-slate-200 dark:bg-\[\#181820\]/g, 'bg-secondary'],
    [/border-slate-200 dark:border-border\/20/g, 'border-border/20'],
    [/border-slate-200 dark:border-border\/40/g, 'border-border/40'],
    [/border-slate-300 dark:border-border\/40/g, 'border-border/40'],
    [/bg-slate-100/g, 'bg-secondary/10'],
    [/rounded-2xl/g, 'rounded-[1.5rem]'],
    [/rounded-3xl/g, 'rounded-[2rem]'],
    [/rounded-xl/g, 'rounded-[1rem]'],
];

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content;
            for (const [regex, replacement] of replacements) {
                newContent = newContent.replace(regex, replacement);
            }
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

walkDir(path.join(srcDir, 'routes'));
walkDir(path.join(srcDir, 'components'));

// Update styles.css colors to lighten the purple
const stylesPath = path.join(srcDir, 'styles.css');
let styles = fs.readFileSync(stylesPath, 'utf8');

// Lighten primary purple from #8b5cf6 to #a78bfa
styles = styles.replace(/--primary: #8b5cf6;/g, '--primary: #a78bfa;');
styles = styles.replace(/--ring: #8b5cf6;/g, '--ring: #a78bfa;');
styles = styles.replace(/--sidebar-primary: #8b5cf6;/g, '--sidebar-primary: #a78bfa;');
styles = styles.replace(/--sidebar-ring: #8b5cf6;/g, '--sidebar-ring: #a78bfa;');
styles = styles.replace(/--chart-1: #8b5cf6;/g, '--chart-1: #a78bfa;');
styles = styles.replace(/--glow: #8b5cf6;/g, '--glow: #a78bfa;');

// Lighten Dark Mode Card and Secondary slightly
styles = styles.replace(/--card: #0b0515;/g, '--card: #130a24;');
styles = styles.replace(/--secondary: #1a0b2e;/g, '--secondary: #20103b;');
styles = styles.replace(/--popover: #0b0515;/g, '--popover: #130a24;');

fs.writeFileSync(stylesPath, styles);
console.log('Updated styles.css');
