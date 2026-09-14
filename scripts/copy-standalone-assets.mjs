// Mismo script que en FinanzasApp, adaptado a EntrenoApp. Tras `next build`
// con output:"standalone", hay que:
// 1. Copiar public/ y .next/static/ dentro de .next/standalone (Next.js no
//    lo hace solo).
// 2. Sustituir cualquier symlink que next build cree dentro de
//    .next/standalone/.next/node_modules por una copia real — si no,
//    electron-builder intenta recrear esos symlinks en Windows y falla con
//    EPERM (permisos especiales que un usuario normal no tiene).
// 3. Borrar del paquete final lo que el servidor standalone no necesita en
//    tiempo de ejecución (código fuente, scripts, .bat, builds anteriores...).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const standaloneDir = path.join(root, ".next", "standalone");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

copyRecursive(path.join(root, "public"), path.join(standaloneDir, "public"));
copyRecursive(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));

function replaceSymlinksWithRealFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const real = fs.realpathSync(full);
      fs.rmSync(full, { force: true });
      fs.cpSync(real, full, { recursive: true });
    } else if (entry.isDirectory()) {
      replaceSymlinksWithRealFiles(full);
    }
  }
}
replaceSymlinksWithRealFiles(standaloneDir);

const REMOVE_FROM_STANDALONE = [
  "release",
  "src",
  "scripts",
  "electron",
  "build",
  "Abrir EntrenoApp.bat",
  "Generar instalador.bat",
  "README.md",
  "tsconfig.json",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "next.config.ts",
  "package-lock.json",
];
for (const name of REMOVE_FROM_STANDALONE) {
  fs.rmSync(path.join(standaloneDir, name), { recursive: true, force: true });
}

const symlinksLeft = [];
(function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) symlinksLeft.push(full);
    else if (entry.isDirectory()) scan(full);
  }
})(standaloneDir);

console.log(`copy-standalone-assets: listo. Symlinks restantes en .next/standalone: ${symlinksLeft.length}`);
if (symlinksLeft.length > 0) {
  console.log(symlinksLeft.join("\n"));
}
