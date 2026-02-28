const { app, BrowserWindow, Tray, Menu, globalShortcut, screen, ipcMain, nativeImage, desktopCapturer } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const ICON_PATH = path.join(__dirname, "assets", "icon.png");

const BTN_SIZE = 64;
const PANEL_W = 380;
const PANEL_H = 600;

let mainWindow = null;
let tray = null;
let isExpanded = false;
let widgetIsOpen = false;

function createWindow() {
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: BTN_SIZE,
        height: BTN_SIZE,
        x: screenW - BTN_SIZE - 16,
        y: screenH - BTN_SIZE - 16,
        frame: false,
        transparent: true,
        backgroundColor: "#00000000",
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Load React widget
    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
    } else {
        mainWindow.loadFile(path.join(__dirname, "..", "widget", "dist", "index.html"));
    }

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });

    // Minimize to tray instead of closing
    mainWindow.on("close", (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

// ── IPC: widget tells us to expand/collapse ──────────────────
ipcMain.on("widget:expand", () => {
    if (!mainWindow || isExpanded) return;
    isExpanded = true;
    widgetIsOpen = true;

    const [x, y] = mainWindow.getPosition();
    // Expand upward and to the left from the button position
    const newX = x - (PANEL_W - BTN_SIZE);
    const newY = y - (PANEL_H - BTN_SIZE);

    mainWindow.setBounds({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: PANEL_W,
        height: PANEL_H,
    });
});

ipcMain.on("widget:collapse", () => {
    if (!mainWindow || !isExpanded) return;
    isExpanded = false;
    widgetIsOpen = false;

    const [x, y] = mainWindow.getPosition();
    // Collapse back to button: bottom-right corner of current bounds
    const newX = x + (PANEL_W - BTN_SIZE);
    const newY = y + (PANEL_H - BTN_SIZE);

    mainWindow.setBounds({
        x: newX,
        y: newY,
        width: BTN_SIZE,
        height: BTN_SIZE,
    });

    // Capture immediately after collapse so lastScreenshot is always fresh
    captureInBackground();
});

ipcMain.on("widget:toggle", () => {
    if (isExpanded) {
        ipcMain.emit("widget:collapse");
    } else {
        ipcMain.emit("widget:expand");
    }
});

// ── IPC: window dragging ─────────────────────────────────────
let dragStart = null;

ipcMain.on("drag:start", (_event, { screenX, screenY }) => {
    if (!mainWindow) return;
    const [winX, winY] = mainWindow.getPosition();
    dragStart = { winX, winY, screenX, screenY };
});

ipcMain.on("drag:move", (_event, { screenX, screenY }) => {
    if (!mainWindow || !dragStart) return;
    const dx = screenX - dragStart.screenX;
    const dy = screenY - dragStart.screenY;
    mainWindow.setPosition(dragStart.winX + dx, dragStart.winY + dy);
});

ipcMain.on("drag:end", () => {
    dragStart = null;
});

// ── Background screenshot capture (every 5s) ────────────────
let lastScreenshot = null;

async function captureInBackground() {
    console.log('[bg-capture] Tentando capturar, widgetIsOpen:', widgetIsOpen);
    if (widgetIsOpen) return;
    try {
        const sources = await desktopCapturer.getSources({
            types: ["screen"],
            thumbnailSize: { width: 1280, height: 720 },
        });
        if (sources.length === 0) return;
        const dataUrl = sources[0].thumbnail.toDataURL();
        // Strip any data URL prefix (handles png, jpeg, webp, svg+xml, etc.)
        lastScreenshot = dataUrl.replace(/^data:image\/[^;]+;base64,/, "");
    } catch {
        // Silently ignore background capture errors
    }
}

// Start background capture loop after app is ready
function startBackgroundCapture() {
    captureInBackground(); // first capture immediately
    setInterval(captureInBackground, 5000);
}

ipcMain.on("widget-opened", () => {
    widgetIsOpen = true;
});
ipcMain.on("widget-closed", () => {
    widgetIsOpen = false;
    captureInBackground(); // Captura imediata ao fechar
});

ipcMain.handle("capture-screen", async () => {
    console.log('[capture-screen] widgetIsOpen:', widgetIsOpen);
    console.log('[capture-screen] lastScreenshot length:', lastScreenshot ? lastScreenshot.length : 'null');
    // Always return lastScreenshot — it was captured before the widget opened
    return lastScreenshot;
});

// ── Tray ─────────────────────────────────────────────────────
function createTray() {
    // Create a small 16x16 tray icon from the asset
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 });
    } catch {
        // Fallback: create an empty icon if file is invalid
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Mostrar Co-piloto",
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
        },
        { type: "separator" },
        {
            label: "Fechar",
            click: () => {
                app.isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip("Co-piloto Farma");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
}

// ── Global shortcut ──────────────────────────────────────────
function registerShortcut() {
    globalShortcut.register("Ctrl+Shift+Space", () => {
        if (!mainWindow) return;

        if (mainWindow.isVisible()) {
            // If expanded, collapse first then hide
            if (isExpanded) ipcMain.emit("widget:collapse");
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// ── App lifecycle ────────────────────────────────────────────
app.whenReady().then(() => {
    createWindow();
    createTray();
    registerShortcut();
    startBackgroundCapture();
});

app.on("will-quit", () => {
    globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
