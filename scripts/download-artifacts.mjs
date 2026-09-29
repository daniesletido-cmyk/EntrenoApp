import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const movilDir = path.join(projectRoot, 'movil');
const downloadsDir = 'D:\\Users\\Dani\\Downloads';

if (!fs.existsSync(movilDir)) {
  fs.mkdirSync(movilDir, { recursive: true });
}

console.log('Obteniendo credenciales de GitHub...');
const credProcess = spawnSync('C:\\Program Files\\Git\\bin\\git.exe', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf-8'
});

const match = credProcess.stdout?.match(/password=(.*)/);
if (!match) {
  console.error('No se pudo obtener el token de GitHub.');
  process.exit(1);
}
const token = match[1].trim();

const runId = '34830921842';
const repo = 'daniesletido-cmyk/EntrenoApp';
console.log(`Consultando artefactos de la ejecucion ${runId}...`);

const listResp = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}/artifacts`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'EntrenoApp-Downloader',
    'Accept': 'application/vnd.github+json'
  }
});

if (!listResp.ok) {
  console.error(`Error listando artefactos: ${listResp.status} ${listResp.statusText}`);
  process.exit(1);
}

const listData = await listResp.json();
console.log(`Se encontraron ${listData.total_count} artefactos.`);

for (const artifact of listData.artifacts) {
  console.log(`\nDescargando artefacto: ${artifact.name} (${(artifact.size_in_bytes / (1024 * 1024)).toFixed(2)} MB)...`);
  
  const zipResp = await fetch(artifact.archive_download_url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'EntrenoApp-Downloader'
    },
    redirect: 'manual'
  });

  const redirectUrl = zipResp.headers.get('location');
  if (!redirectUrl) {
    console.error(`No se obtuvo URL de redireccion para ${artifact.name}`);
    continue;
  }

  const fileResp = await fetch(redirectUrl);
  if (!fileResp.ok) {
    console.error(`Error descargando contenido de ${artifact.name}: ${fileResp.statusText}`);
    continue;
  }

  const arrayBuffer = await fileResp.arrayBuffer();
  const zipBuffer = Buffer.from(arrayBuffer);
  const tempZipPath = path.join(movilDir, `${artifact.name}.zip`);
  fs.writeFileSync(tempZipPath, zipBuffer);
  console.log(`Guardado temporal: ${tempZipPath}`);

  console.log(`Descomprimiendo ${artifact.name}.zip en carpeta movil/...`);
  const extractProcess = spawnSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Expand-Archive -Path '${tempZipPath}' -DestinationPath '${movilDir}' -Force`
  ]);

  if (extractProcess.status !== 0) {
    console.error('Error descomprimiendo:', extractProcess.stderr.toString());
  } else {
    console.log('Descomprimido con exito.');
  }

  try {
    fs.unlinkSync(tempZipPath);
  } catch (e) {}
}

console.log('\nArchivos en carpeta movil:');
const filesInMovil = fs.readdirSync(movilDir);
for (const f of filesInMovil) {
  const fullPath = path.join(movilDir, f);
  const stat = fs.statSync(fullPath);
  console.log(`- ${f} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);

  if (fs.existsSync(downloadsDir) && (f.endsWith('.apk') || f.endsWith('.ipa'))) {
    const destDownloads = path.join(downloadsDir, f);
    fs.copyFileSync(fullPath, destDownloads);
    console.log(`  -> Copiado tambien a Descargas: ${destDownloads}`);
  }
}

console.log('\nProceso completado con exito!');
