// Proceso principal de Electron para EntrenoApp:
// - DB_PATH / carpeta de datos en <carpeta del proyecto>/data o userData.
// - Arranca el servidor standalone de Next.js en el propio proceso.
// - Splash mientras el servidor arranca (sondeo HTTP), luego ventana principal.
// - Single instance lock para evitar conflictos de puerto y cierres silenciosos.
// - Captura global de unhandledRejection y render-process-gone para máxima estabilidad.
const { app, BrowserWindow, session } = require("electron");
const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");

// Evitar múltiples instancias simultáneas en conflicto
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

const PORT = 3211;
let mainWindow = null;
let splashWindow = null;

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Prevenir cierres abruptos por promesas rechazadas en segundo plano
process.on("unhandledRejection", (reason, promise) => {
  console.error("[EntrenoApp] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[EntrenoApp] Uncaught Exception:", err);
  if (!mainWindow && splashWindow) {
    try {
      splashWindow.close();
    } catch {}
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
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "EntrenoApp",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once("ready-to-show", () => {
    if (splashWindow) {
      try {
        splashWindow.close();
      } catch {}
    }
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Evitar cierre por fallo de renderizado
  mainWindow.webContents.on("render-process-gone", (event, detailed) => {
    console.error("[EntrenoApp] Renderer process gone:", detailed.reason);
    if (detailed.reason !== "clean-exit") {
      setTimeout(() => {
        if (mainWindow) mainWindow.loadURL(`http://127.0.0.1:${PORT}/hoy`);
      }, 500);
    }
  });

  // Diálogo nativo "Guardar como" para la copia de seguridad
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

  // 2. Comprobar bundle local del proyecto (si existe en este equipo, comparar para usar el más nuevo)
  const localProjectServer = path.join(__dirname, "..", ".next", "standalone", "server.js");
  const userServer = path.join(userBundleDir, ".next", "standalone", "server.js");

  if (fs.existsSync(localProjectServer)) {
    if (!fs.existsSync(userServer)) {
      console.log("[EntrenoApp] Cargando bundle local del proyecto:", localProjectServer);
      process.env.ENTRENO_BUNDLE_SOURCE = "Proyecto Local";
      return localProjectServer;
    }
    const localMtime = fs.statSync(localProjectServer).mtimeMs;
    const userMtime = fs.statSync(userServer).mtimeMs;
    if (localMtime >= userMtime) {
      console.log("[EntrenoApp] Bundle del proyecto es más reciente:", localProjectServer);
      process.env.ENTRENO_BUNDLE_SOURCE = "Proyecto Local Reciente";
      return localProjectServer;
    }
  }

  // 3. Si existe un bundle actualizado en userData, arrancar desde ahí
  if (fs.existsSync(userServer)) {
    console.log("[EntrenoApp] Cargando bundle actualizado (hot-update):", userServer);
    process.env.ENTRENO_BUNDLE_SOURCE = "Actualización local (Hot-Bundle)";
    return userServer;
  }

  // 4. Si está empaquetado (.exe instalado), usar el servidor empaquetado en resources
  if (app.isPackaged) {
    const packagedServer = path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone", "server.js");
    if (fs.existsSync(packagedServer)) {
      console.log("[EntrenoApp] Cargando bundle empaquetado base:", packagedServer);
      process.env.ENTRENO_BUNDLE_SOURCE = "Instalado Base";
      return packagedServer;
    }
  }

  return localProjectServer;
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
    if (splashWindow) {
      try {
        splashWindow.close();
      } catch {}
    }
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

app.on("window-all-closed", () => {
  app.quit();
});
