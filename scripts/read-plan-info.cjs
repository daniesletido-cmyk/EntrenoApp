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

printSummary('adri_PLAN_DE_ENTRENAMIENTO_pdf.txt', 150);
printSummary('adri_INFORME_PRUEBA_DE_ESFUERZO___D.txt', 150);
