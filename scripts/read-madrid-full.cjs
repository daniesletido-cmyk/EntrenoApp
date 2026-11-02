const fs = require('fs');
const path = require('path');

function printSummary(filename, maxLines = 150) {
  const p = path.join('Entrenos Adri', filename);
  if (!fs.existsSync(p)) return;
  console.log(`\n================== ${filename} ==================`);
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split('\n');
  console.log(lines.slice(0, maxLines).join('\n'));
}

printSummary('adri_ESTRATEGIA_MARAT_N_MADRID__1__.txt', 200);
