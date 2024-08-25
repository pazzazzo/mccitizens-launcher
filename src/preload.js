const { contextBridge, ipcRenderer, app } = require('electron')

contextBridge.exposeInMainWorld("electronAPI", {
    autoConnect: () => ipcRenderer.send("auto_connect"),
    connect: () => ipcRenderer.send("connect"),
    reset: () => ipcRenderer.send("reset"),
    onConnected: (callback) => ipcRenderer.on("connected", (event, ...args) => callback(...args)),
    onNotConnected: (callback) => ipcRenderer.on("not_connected", (event, ...args) => callback(...args)),
    onDownloadStatus: (callback) => ipcRenderer.on("download.status", (event, ...args) => callback(...args)),
    launch: () => ipcRenderer.send("launch"),
    getStatus: (address, port = 25565) => ipcRenderer.invoke("getServerStatus", address, port),
    getMemory: () => ipcRenderer.invoke("getMemory"),
    getVersion: () => app.getVersion(),
    setJavaOption: (config) => ipcRenderer.send("java.option.set", config),
    getJavaOption: () => ipcRenderer.invoke("java.option.get")
})

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("version").innerText = await ipcRenderer.invoke("getVersion")
})