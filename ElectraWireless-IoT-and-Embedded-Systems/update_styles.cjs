const fs = require('fs');
const path = require('path');

const stylesPath = path.join(__dirname, 'src', 'styles.css');
let styles = fs.readFileSync(stylesPath, 'utf8');

const lightThemeReplacement = `:root {
  /* Light Theme — Soft Off-White and Purple */
  --radius: 1.5rem;
  --background: #ffffff;
  --foreground: #000000;
  --card: #fbf5ff;
  --card-foreground: #000000;
  --popover: #ffffff;
  --popover-foreground: #000000;
  --primary: #8b5cf6;
  --primary-foreground: #ffffff;
  --secondary: #f3e8ff;
  --secondary-foreground: #6b21a8;
  --muted: #f3e8ff;
  --muted-foreground: #7e22ce;
  --accent: #f3e8ff;
  --accent-foreground: #6b21a8;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --success: #34d399;
  --success-foreground: #ffffff;
  --warning: #fbbf24;
  --warning-foreground: #000000;
  --border: #e9d5ff;
  --input: #e9d5ff;
  --ring: #8b5cf6;
  --chart-1: #8b5cf6;
  --chart-2: #a78bfa;
  --chart-3: #c4b5fd;
  --chart-4: #34d399;
  --chart-5: #fbbf24;
  --glow: #a78bfa;
  --sidebar: #ffffff;
  --sidebar-foreground: #000000;
  --sidebar-primary: #8b5cf6;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f3e8ff;
  --sidebar-accent-foreground: #6b21a8;
  --sidebar-border: #e9d5ff;
  --sidebar-ring: #8b5cf6;
}`;

const darkThemeReplacement = `.dark {
  /* Deep Premium Black and Purple */
  --background: #000000;
  --foreground: #ffffff;
  --card: #0b0515;
  --card-foreground: #ffffff;
  --popover: #0b0515;
  --popover-foreground: #ffffff;
  --primary: #8b5cf6;
  --primary-foreground: #ffffff;
  --secondary: #1a0b2e;
  --secondary-foreground: #d8b4fe;
  --muted: #1a0b2e;
  --muted-foreground: #a855f7;
  --accent: #1a0b2e;
  --accent-foreground: #d8b4fe;
  --destructive: #f0506e;
  --destructive-foreground: #ffffff;
  --success: #34d399;
  --success-foreground: #000000;
  --warning: #fbbf24;
  --warning-foreground: #000000;
  --border: #2e1065;
  --input: #2e1065;
  --ring: #8b5cf6;
  --chart-1: #8b5cf6;
  --chart-2: #a855f7;
  --chart-3: #c084fc;
  --chart-4: #34d399;
  --chart-5: #fbbf24;
  --glow: #8b5cf6;
  --sidebar: #000000;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #8b5cf6;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1a0b2e;
  --sidebar-accent-foreground: #d8b4fe;
  --sidebar-border: #2e1065;
  --sidebar-ring: #8b5cf6;
}`;

styles = styles.replace(/:root\s*\{[\s\S]*?\}\n\n\.dark/, lightThemeReplacement + '\n\n.dark');
styles = styles.replace(/\.dark\s*\{[\s\S]*?\}/, darkThemeReplacement);

fs.writeFileSync(stylesPath, styles);
console.log('Styles updated.');
