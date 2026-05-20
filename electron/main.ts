import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
// CommonJS-friendly imports (tsc → dist-electron uses --module NodeNext output);
// electron-updater + electron-store both expose CJS default exports.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { autoUpdater } = require("electron-updater") as typeof import("electron-updater");
// electron-store types are gnarly with require() — use a minimal interface.
interface KvStore<T> {
  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
}
type StoreConstructor = new <T>(opts: { defaults: T }) => KvStore<T>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Store = require("electron-store") as StoreConstructor;
import path from "node:path";

interface AppState {
  env: "local" | "prod";
}

const store = new Store<AppState>({ defaults: { env: "local" } });

const ENV_URLS: Record<"local" | "prod", string> = {
  local: "http://localhost:4105",
  prod: "https://app.hearst.connect",
};

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

function createSplash(): void {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const splashPath = app.isPackaged
    ? path.join(process.resourcesPath, "splash.html")
    : path.join(__dirname, "..", "electron", "splash.html");
  splashWindow.loadFile(splashPath);
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createMainWindow(env: "local" | "prod"): void {
  store.set("env", env);
  const url = ENV_URLS[env];

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#1A050B",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: env === "prod",
    },
  });

  mainWindow.loadURL(url);

  // Open external links in the user's default browser. Only http(s) — never
  // file:// nor custom schemes (would allow open-redirect from a compromised
  // page).
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol === "http:" || u.protocol === "https:") {
        shell.openExternal(url);
      }
    } catch {
      /* invalid URL — drop */
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Switch environment…",
          click: () => {
            mainWindow?.close();
            createSplash();
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      label: "Help",
      submenu: [
        {
          label: "Hearst Connect — github.com/Hearst-Corporation/Hearst-Defi",
          click: () => shell.openExternal("https://github.com/Hearst-Corporation/Hearst-Defi"),
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

ipcMain.handle("select-env", (_event, env: "local" | "prod") => {
  splashWindow?.close();
  createMainWindow(env);
});

ipcMain.handle("get-last-env", () => store.get("env", "local"));

app.whenReady().then(() => {
  createSplash();
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createSplash();
});

autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall();
});
