const fs = require('fs');
const path = require('path');

const p = path.join('Entrenos Adri', 'adri_ESTRATEGIA_MARAT_N_MADRID__1.txt');
if (fs.existsSync(p)) {
  console.log(fs.readFileSync(p, 'utf8'));
} else {
  console.log('File not found, checking existing adri_ files...');
  fs.readdirSync('Entrenos Adri').filter(f => f.startsWith('adri_')).forEach(f => console.log(f));
}
