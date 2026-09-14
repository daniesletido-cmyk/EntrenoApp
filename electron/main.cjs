// Proceso principal de Electron. Mismo patrón ya probado en FinanzasApp:
// - DB_PATH / carpeta de datos en userData (nunca dentro de la carpeta de
//   instalación, que puede ser de solo lectura).
// - Arranca el servidor standalone de Next.js en el propio proceso.
// - Splash mientras el servidor arranca (sondeo HTTP), luego ventana principal.
// - contextIsolation true, nodeIntegration false, sandbox true, sin menú,
//   sin barra de direcciones — nada de Node expuesto a la página.
const { app, BrowserWindow, session } = require("electron");
const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");

const PORT = 3211;
let mainWindow = null;
let splashWindow = null;

// Esta app se ha usado casi siempre arrancándola con "Abrir EntrenoApp.bat"
// (npm run dev), que guarda su base de datos en <carpeta del proyecto>/data
// porque DB_PATH no está fijado ahí (ver resolveDbPath() en src/lib/db.ts).
// Si el .exe empaquetado usara la carpeta userData de Windows como antes,
// acabaríamos con DOS bases de datos separadas: el plan/entrenos de siempre
// por un lado, y lo que se importe desde el .exe por otro. Para evitarlo,
// el .exe apunta a la MISMA carpeta "data" del proyecto en este equipo.
// Si esa carpeta no existiera o no se pudiera escribir (por ejemplo, en otro
// PC, o si se mueve el proyecto), cae de vuelta a userData como haría
// cualquier app instalada normal.
const PROJECT_DATA_DIR = "C:\\Users\\danie\\Desktop\\Aplicaciones\\EntrenoApp\\data";

function getDataDir() {
  try {
    fs.mkdirSync(PROJECT_DATA_DIR, { recursive: true });
    fs.accessSync(PROJECT_DATA_DIR, fs.constants.W_OK);
    return PROJECT_DATA_DIR;
  } catch {
    return app.getPath("userData");
  }
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    resizable: false,
    transparent: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: "EntrenoApp",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once("ready-to-show", () => {
    if (splashWindow) splashWindow.close();
    mainWindow.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Diálogo nativo "Guardar como" para la copia de seguridad (igual que FinanzasApp).
  session.defaultSession.on("will-download", (event, item) => {
    const fileName = item.getFilename();
    const savePath = require("electron").dialog.showSaveDialogSync(mainWindow, {
      defaultPath: fileName,
    });
    if (!savePath) {
      item.cancel();
      return;
    }
    item.setSavePath(savePath);
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) reject(new Error("Timeout esperando al servidor"));
          else setTimeout(tryOnce, 300);
        });
    };
    tryOnce();
  });
}

function resolveServerPath() {
  const userDataDir = app.getPath("userData");
  const userBundleDir = path.join(userDataDir, "app-bundle");
  const pendingUpdateDir = path.join(userDataDir, "pending-update");

  // 1. Si hay una actualización pendiente en userData, sustituir app-bundle
  if (fs.existsSync(pendingUpdateDir)) {
    try {
      console.log("[EntrenoApp] Aplicando actualización pendiente desde:", pendingUpdateDir);
      if (fs.existsSync(userBundleDir)) {
        fs.rmSync(userBundleDir, { recursive: true, force: true });
      }
      fs.renameSync(pendingUpdateDir, userBundleDir);
      console.log("[EntrenoApp] Actualización aplicada con éxito a app-bundle.");
    } catch (err) {
      console.error("[EntrenoApp] Error al aplicar actualización pendiente:", err);
    }
  }

  // 2. Si existe un bundle actualizado en userData, arrancar desde ahí
  const userServer = path.join(userBundleDir, ".next", "standalone", "server.js");
  if (fs.existsSync(userServer)) {
    console.log("[EntrenoApp] Cargando bundle actualizado (hot-update):", userServer);
    process.env.ENTRENO_BUNDLE_SOURCE = "Actualización local (Hot-Bundle)";
    return userServer;
  }

  // 3. Si está empaquetado (.exe instalado), usar el servidor empaquetado en resources
  if (app.isPackaged) {
    const packagedServer = path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone", "server.js");
    if (fs.existsSync(packagedServer)) {
      console.log("[EntrenoApp] Cargando bundle empaquetado base:", packagedServer);
      process.env.ENTRENO_BUNDLE_SOURCE = "Instalado Base";
      return packagedServer;
    }
  }

  // 4. Modo desarrollo / fallback local
  const devServer = path.join(__dirname, "..", ".next", "standalone", "server.js");
  if (fs.existsSync(devServer)) {
    console.log("[EntrenoApp] Cargando bundle de desarrollo local:", devServer);
    process.env.ENTRENO_BUNDLE_SOURCE = "Desarrollo Local";
    return devServer;
  }

  return path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone", "server.js");
}

app.whenReady().then(async () => {
  createSplash();
  try {
    process.env.PORT = String(PORT);
    process.env.HOSTNAME = "127.0.0.1";
    process.env.DB_PATH = path.join(getDataDir(), "entrenoapp.db");

    const serverPath = resolveServerPath();

    require(serverPath);
    await waitForServer(`http://127.0.0.1:${PORT}/`);

    createMainWindow();
    mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);
  } catch (err) {
    if (splashWindow) splashWindow.close();
    const errWindow = new BrowserWindow({ width: 700, height: 500 });
    errWindow.loadURL(
      "data:text/html," +
        encodeURIComponent(
          `<pre style="white-space:pre-wrap;font-family:monospace;padding:20px;">Error al arrancar EntrenoApp:\n\n${String(
            (err && err.stack) || err
          )}</pre>`
        )
    );
  }
});

process.on("uncaughtException", (err) => {
  if (splashWindow) splashWindow.close();
  const errWindow = new BrowserWindow({ width: 700, height: 500 });
  errWindow.loadURL(
    "data:text/html," +
      encodeURIComponent(
        `<pre style="white-space:pre-wrap;font-family:monospace;padding:20px;">Error inesperado:\n\n${String(
          (err && err.stack) || err
        )}</pre>`
      )
  );
});

app.on("window-all-closed", () => {
  app.quit();
});
