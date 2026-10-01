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
const repo = 'daniesletido-cmyk/EntrenoApp';

async function waitForRunAndDownload() {
  console.log('Buscando la última ejecución de GitHub Actions para compilar el APK...');
  let completedRun = null;

  for (let i = 0; i < 40; i++) {
    const listResp = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'EntrenoApp-Downloader',
        'Accept': 'application/vnd.github+json'
      }
    });

    if (listResp.ok) {
      const listData = await listResp.json();
      const runs = listData.workflow_runs || [];
      const latest = runs[0];
      if (latest) {
        console.log(`[Intento ${i + 1}/40] Run ${latest.id} (${latest.name}) -> Estado: ${latest.status}, Conclusión: ${latest.conclusion || 'en progreso'}`);
        if (latest.status === 'completed' && latest.conclusion === 'success') {
          completedRun = latest;
          break;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 6000));
  }

  if (!completedRun) {
    console.error('El workflow todavía está compilando en GitHub Actions. Vuelve a ejecutar el script en un momento.');
    process.exit(1);
  }

  console.log(`\nConsultando artefactos de la ejecución ${completedRun.id}...`);
  const artResp = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${completedRun.id}/artifacts`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'EntrenoApp-Downloader',
      'Accept': 'application/vnd.github+json'
    }
  });

  const artData = await artResp.json();
  console.log(`Se encontraron ${artData.total_count} artefactos.`);

  for (const artifact of artData.artifacts) {
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
      console.error(`No se obtuvo URL de redirección para ${artifact.name}`);
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

    console.log(`Descomprimiendo ${artifact.name}.zip en carpeta movil/...`);
    const extractProcess = spawnSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path '${tempZipPath}' -DestinationPath '${movilDir}' -Force`
    ]);

    if (extractProcess.status !== 0) {
      console.error('Error descomprimiendo:', extractProcess.stderr.toString());
    } else {
      console.log('Descomprimido con éxito.');
    }

    try {
      fs.unlinkSync(tempZipPath);
    } catch {}
  }

  console.log('\n============================================================');
  console.log('   ARCHIVOS DE APLICACIÓN MÓVIL DISPONIBLES');
  console.log('============================================================');
  const filesInMovil = fs.readdirSync(movilDir);
  for (const f of filesInMovil) {
    const fullPath = path.join(movilDir, f);
    const stat = fs.statSync(fullPath);
    console.log(`- ${f} (${(stat.size / (1024 * 1024)).toFixed(2)} MB) -> ${fullPath}`);

    if (fs.existsSync(downloadsDir) && (f.endsWith('.apk') || f.endsWith('.ipa'))) {
      const destDownloads = path.join(downloadsDir, f);
      fs.copyFileSync(fullPath, destDownloads);
      console.log(`  -> Copiado automáticamente a tu carpeta de Descargas: ${destDownloads}`);
    }
  }
}

waitForRunAndDownload();
