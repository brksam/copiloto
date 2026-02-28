const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    isElectron: true,
    platform: process.platform,
    expand: () => ipcRenderer.send("widget:expand"),
    collapse: () => ipcRenderer.send("widget:collapse"),
    toggle: () => ipcRenderer.send("widget:toggle"),
    dragStart: (screenX, screenY) => ipcRenderer.send("drag:start", { screenX, screenY }),
    dragMove: (screenX, screenY) => ipcRenderer.send("drag:move", { screenX, screenY }),
    dragEnd: () => ipcRenderer.send("drag:end"),
    captureScreen: () => ipcRenderer.invoke("capture-screen"),
    notifyWidgetOpened: () => ipcRenderer.send("widget-opened"),
    notifyWidgetClosed: () => ipcRenderer.send("widget-closed"),
});
