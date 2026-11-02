const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function processAll() {
  const dir = path.join(process.cwd(), 'Entrenos Adri');
  const files = fs.readdirSync(dir);
  console.log('Files count in Entrenos Adri:', files.length);

  for (const file of files) {
    if (!file.endsWith('.pdf')) continue;
    const fullPath = path.join(dir, file);
    try {
      const buffer = fs.readFileSync(fullPath);
      const data = await pdf(buffer);
      console.log(`\n========================================`);
      console.log(`FILE: ${file} | Pages: ${data.numpages} | Chars: ${data.text.length}`);
      console.log(`========================================`);
      // Print first 500 characters and check what it contains
      const cleanText = data.text.replace(/\r\n/g, '\n').replace(/\n+/g, '\n');
      console.log(cleanText.substring(0, 700));
      // Save full text to a file
      const outTextName = 'adri_' + file.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) + '.txt';
      fs.writeFileSync(path.join('Entrenos Adri', outTextName), cleanText);
    } catch (e) {
      console.error(`Error in ${file}:`, e.message);
    }
  }
}

processAll();
