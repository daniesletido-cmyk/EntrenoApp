import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apiDir = path.join(root, "src", "app", "api");
const tempApiDir = path.join(root, "src", "_temp_api_backup");

console.log("\n============================================================");
console.log("   ENTRENOAPP - COMPILANDO FRONTEND ESTÁTICO PARA MÓVIL");
console.log("============================================================\n");

let apiMoved = false;
try {
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, tempApiDir);
    apiMoved = true;
    console.log("[1/3] Rutas /api aisladas temporalmente para permitir export estático.");
  }

  console.log("[2/3] Compilando páginas UI con Next.js (output: export)...");
  execSync("npx next build", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      MOBILE_BUILD: "true",
    },
  });

  console.log("\n[3/3] Export estático completado con éxito en la carpeta 'out/'.");
} catch (err) {
  console.error("\n[ERROR] Falló la compilación móvil:", err.message);
  process.exitCode = 1;
} finally {
  if (apiMoved && fs.existsSync(tempApiDir)) {
    fs.renameSync(tempApiDir, apiDir);
    console.log("[Restauración] Rutas /api restauradas intactas en src/app/api.");
  }
}
