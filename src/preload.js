const { contextBridge, ipcRenderer, app } = require('electron')

contextBridge.exposeInMainWorld("electronAPI", {
    autoConnect: () => ipcRenderer.send("auto_connect"),
    connect: () => ipcRenderer.send("connect"),
    reset: () => ipcRenderer.send("reset"),
    onConnected: (callback) => ipcRenderer.on("connected", (event, ...args) => callback(...args)),
    onNotConnected: (callback) => ipcRenderer.on("not_connected", (event, ...args) => callback(...args)),
    onDownloadStatus: (callback) => ipcRenderer.on("download.status", (event, ...args) => callback(...args)),
    onProgressStatus: (callback) => ipcRenderer.on("progress.status", (event, ...args) => callback(...args)),
    launch: () => ipcRenderer.send("launch"),
    getStatus: (address, port = 25565) => ipcRenderer.invoke("getServerStatus", address, port),
    getMemory: () => ipcRenderer.invoke("getMemory"),
    getVersion: () => app.getVersion(),
    setJavaOption: (config) => ipcRenderer.send("java.option.set", config),
    getJavaOption: () => ipcRenderer.invoke("java.option.get"),
    setLauncherOption: (config) => ipcRenderer.send("launcher.option.set", config),
    getLauncherOption: () => ipcRenderer.invoke("launcher.option.get"),
    loadProfile: () => ipcRenderer.send("profile.load"),
    onLoadProfileStatus: (callback) => ipcRenderer.on("profile.load.status", (event, ...args) => callback(...args)),
    
})

contextBridge.exposeInMainWorld("popup", {
    info: (message) => {
        const p = document.createElement("div")
        p.classList.add("popup", "success-popup")
        p.innerHTML = `<div class="popup-icon success-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="success-svg"><path fill-rule="evenodd"d="m12 1c-6.075 0-11 4.925-11 11s4.925 11 11 11 11-4.925 11-11-4.925-11-11-11zm4.768 9.14c.0878-.1004.1546-.21726.1966-.34383.0419-.12657.0581-.26026.0477-.39319-.0105-.13293-.0475-.26242-.1087-.38085-.0613-.11844-.1456-.22342-.2481-.30879-.1024-.08536-.2209-.14938-.3484-.18828s-.2616-.0519-.3942-.03823c-.1327.01366-.2612.05372-.3782.1178-.1169.06409-.2198.15091-.3027.25537l-4.3 5.159-2.225-2.226c-.1886-.1822-.4412-.283-.7034-.2807s-.51301.1075-.69842.2929-.29058.4362-.29285.6984c-.00228.2622.09851.5148.28067.7034l3 3c.0983.0982.2159.1748.3454.2251.1295.0502.2681.0729.4069.0665.1387-.0063.2747-.0414.3991-.1032.1244-.0617.2347-.1487.3236-.2554z"clip-rule="evenodd"></path></svg></div><div class="success-message">${message}</div><div class="popup-icon close-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true" class="close-svg"><pathd="m15.8333 5.34166-1.175-1.175-4.6583 4.65834-4.65833-4.65834-1.175 1.175 4.65833 4.65834-4.65833 4.6583 1.175 1.175 4.65833-4.6583 4.6583 4.6583 1.175-1.175-4.6583-4.6583z"class="close-path"></path></svg></div>`
        document.getElementById("popup-container").appendChild(p)
        setTimeout(() => {
            p.remove()
        }, 5000);
    },
    error: (message) => {
        const p = document.createElement("div")
        p.classList.add("popup", "error-popup")
        p.innerHTML = `<div class="popup-icon error-icon"><svg class="error-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd"d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"clip-rule="evenodd"></path></svg></div><div class="error-message">${message}</div><div class="popup-icon close-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="close-svg"><pathd="m15.8333 5.34166-1.175-1.175-4.6583 4.65834-4.65833-4.65834-1.175 1.175 4.65833 4.65834-4.65833 4.6583 1.175 1.175 4.65833-4.6583 4.6583 4.6583 1.175-1.175-4.6583-4.6583z"class="close-path"></path></svg></div>`
        document.getElementById("popup-container").appendChild(p)
        setTimeout(() => {
            p.remove()
        }, 5000);
    },
})

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("version").innerText = await ipcRenderer.invoke("getVersion")
})