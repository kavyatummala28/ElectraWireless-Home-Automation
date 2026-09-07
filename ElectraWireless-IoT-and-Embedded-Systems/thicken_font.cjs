const fs = require('fs');
const path = require('path');

const stylesPath = path.join(__dirname, 'src', 'styles.css');
let styles = fs.readFileSync(stylesPath, 'utf8');

styles = styles.replace(
  '  body {\n    background-color: var(--color-background);\n    color: var(--color-foreground);\n    font-family: var(--font-sans);\n  }',
  '  body {\n    background-color: var(--color-background);\n    color: var(--color-foreground);\n    font-family: var(--font-sans);\n    font-weight: 500;\n  }'
);

fs.writeFileSync(stylesPath, styles);
console.log('Thickened font successfully.');
