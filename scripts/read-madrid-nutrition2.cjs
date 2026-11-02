const fs = require('fs');
const path = require('path');

const p = path.join('Entrenos Adri', 'adri_ESTRATEGIA_MARAT_N_MADRID__1__.txt');
const content = fs.readFileSync(p, 'utf8');
const lines = content.split('\n');
console.log(lines.slice(320, 450).join('\n'));
