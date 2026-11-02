const fs = require('fs');
const pdf = require('pdf-parse');

async function dumpPdf(filePath, maxLen = 3000) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log('File does not exist:', filePath);
      return;
    }
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    console.log(`=== ${filePath} ===`);
    console.log(`Pages: ${data.numpages}`);
    console.log(data.text.slice(0, maxLen));
    console.log('\n----------------------------------------\n');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
}

async function run() {
  await dumpPdf('./ANALISIS_PLANIFICACION_DANI_ESPINOSA.pdf', 3000);
  await dumpPdf('./Entrenos Adri/ESTRATEGIA MARATÓN MADRID (1).pdf', 3000);
  await dumpPdf('./Entrenos Adri/ESTRATEGIA BEHOBIA COMPLETA (1).pdf', 3000);
  await dumpPdf('./PLAN_MARATON_MADRID_CALENDARIO_Y_226ERS_DANI.pdf', 3000);
}

run();
