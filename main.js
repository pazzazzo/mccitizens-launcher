/* eslint-disable no-control-regex */
let startTime = performance.now()
require("colors")
const { app, BrowserWindow, ipcMain, shell, Menu, Tray } = require('electron')
const { Client } = require("minecraft-launcher-core");
const { autoUpdater } = require('electron-updater');
const childProcess = require('child_process');
const { Worker } = require('worker_threads');
const Store = require('electron-store');
const path = require('path')
const net = require('net')
const os = require("os")
const fs = require("fs");
const log = require("electron-log/main")
Object.assign(console, log.functions);

require("dotenv").config({ path: path.join(__dirname, ".env.prod"), quiet: true })

const isDev = require("./isdev")
const rootPath = require("./rootPath");
const updateMods = require("./updateMods");
const updateKube = require("./updateKube");
const installJDK = require("./installJDK");
const XboxManager = require("./XboxManager");
const loadProfile = require("./loadProfile");
const updateServer = require("./updateServer");
const isClientPackageInstalled = require("./isClientPackageInstalled");


console.log("Client package rev: " + process.env.INSTALL_REV);


/** @type {BrowserWindow} */
let mainWindow;

/** @type {BrowserWindow} */
let loadWindow;
let store = new Store()
let xboxManager = new XboxManager(store)
let liveServer
let serverIP

/** @type {childProcess.ChildProcessWithoutNullStreams | null} */
let minecraftProc = null;

/** @type {Menu} */
let contextMenu;

/** @type {Tray} */
let appTray

const launcher = new Client();

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('electron-fiddle', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('electron-fiddle')
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        minWidth: 800,
        minHeight: 600,
        width: 1250,
        height: 758,
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "src", 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    })
    mainWindow.loadFile(path.join(__dirname, "src", "index.html"), {
        query: {
            payload: encodeURIComponent(JSON.stringify(xboxManager.playerData))
        }
    })
    mainWindow.on("ready-to-show", () => {
        mainWindow.show()
        loadWindow && loadWindow.closable && loadWindow.close()
        loadWindow = null
        console.log(`Main took: ${(performance.now() - startTime).toFixed(2)}ms`);
    })
    mainWindow.on("close", () => {
        mainWindow = null
    })

    // Vérification des mises à jour
    autoUpdater.logger = null
    autoUpdater.checkForUpdates();
}

const createLoadWindow = () => {
    loadWindow = new BrowserWindow({
        width: 400,
        height: 400,
        resizable: false,
        autoHideMenuBar: true,
        titleBarStyle: "hidden",
        show: false,
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            javascript: false,
            transparent: true
        }
    })
    loadWindow.loadFile(path.join(__dirname, "src", "load.html"))
    loadWindow.on("ready-to-show", () => {
        console.log(`Splash took: ${(performance.now() - startTime).toFixed(2)}ms`);
        loadWindow.show()
    })
}

autoUpdater.on('update-available', () => {
    console.log("Update");
    if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, "src", "update", "index.html"), {
            query: {
                payload: encodeURIComponent(JSON.stringify(xboxManager.playerData))
            }
        })
    }
});

autoUpdater.on('update-not-available', () => {
    console.log("no update");
});

autoUpdater.on("checking-for-update", () => {
    console.log("check");
})

autoUpdater.on('error', (error) => {
    console.log(error);
});

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
        mainWindow.webContents.send("update.progress", Math.floor(progressObj.percent))
    }
});

function buildTray() {
    contextMenu = Menu.buildFromTemplate([
        { label: 'Ouvrir', type: 'normal' },
        { type: 'separator' },
        { label: 'Fermer Minecraft', type: 'normal', enabled: (xboxManager.state === "launch" || xboxManager.state === "launched") },
        { label: 'Quitter', type: 'normal', role: "quit" },
    ])

    contextMenu.items.forEach((btn, i) => {
        btn.click = () => {
            switch (i) {
                case 0:
                    if (mainWindow) {
                        if (!mainWindow.isDestroyed() && mainWindow.isMinimized()) mainWindow.restore()
                        mainWindow.focus()
                    } else {
                        createWindow()
                    }
                    break;
                case 2:
                    if (minecraftProc && xboxManager.state === "launched" || xboxManager.state === "launch") {
                        minecraftProc.kill("SIGKILL")
                    }
                    break;
                case 3:
                    app.quit()
                    break;
                default:
                    break;
            }
        }
    })
    appTray.setContextMenu(contextMenu)
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, wd, ad) => {
        if (mainWindow) {
            if (!mainWindow.isDestroyed() && mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        } else {
            createLoadWindow()
            createWindow()
        }
        console.log("hey:", commandLine, wd, ad);
        console.log(process.argv);

    })

    app.whenReady().then(() => {
        createLoadWindow()
        xboxManager.autoConnect().then(() => {
            createWindow()
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) createWindow()
            })
        }).catch(rej => {
            console.log("Can't autoconnect: ", rej);
            loadWindow && loadWindow.closable && loadWindow.close()
            loadWindow = null
            xboxManager.connectModal().then(() => {
                createLoadWindow()
                createWindow()
                app.on('activate', () => {
                    if (BrowserWindow.getAllWindows().length === 0) createWindow()
                })
            }).catch(rej => {
                console.log("Can't connect: ", rej);
                // app.quit()
            })
        })
        console.log(process.argv);

        appTray = new Tray(path.join(__dirname, "src", "assets", "icons", "icon_64.png"))
        appTray.setToolTip("MCCitizens")
        buildTray()
    })
}

app.on('window-all-closed', () => {
    // if (process.platform !== 'darwin') app.quit()
})

ipcMain.on("reset", () => {
    store.clear()
    app.quit()
})

ipcMain.on("server.status", async (e) => {
    if (serverIP) {
        let serverStat = await fetchServerStatus()
        if (serverStat.online) {
            e.reply("server.status", serverStat)
        } else {
            await updateIP()
            serverStat = await fetchServerStatus()
            e.reply("server.status", serverStat)
        }
    } else {
        await updateIP()
        let serverStat = await fetchServerStatus()
        e.reply("server.status", serverStat)
    }


})

async function updateIP() {
    try {
        const r = await fetch("https://raw.githubusercontent.com/pazzazzo/mccitizens-clientpackage/refs/heads/main/ip.txt")
        if (r.ok) {
            serverIP = (await r.text()).replace(/\n/g, "")
            updateServer(serverIP)
            return true
        }
        console.log(r);
    } catch {
        return false
    }
}

function fetchServerStatus() {
    const connectTimeoutMs = 10000
    const idleTimeoutMs = 12000
    let [address, port] = serverIP.split(":");
    port = port ? parseInt(port, 10) : 25565;

    return new Promise((resolve) => {
        let settled = false;
        const settle = (val) => {
            if (settled) return;
            settled = true;
            try { socket.destroy(); } catch { /* empty */ }
            clearTimeout(connectTimer);
            resolve(val);
        };

        const socket = net.connect({ host: address, port });

        // Timeout si la connexion n’est jamais établie
        const connectTimer = setTimeout(() => {
            settle({ online: false, reason: 'connect-timeout' });
        }, connectTimeoutMs);

        socket.once('connect', () => {
            // Maintenant seulement on met un idle-timeout
            socket.setTimeout(idleTimeoutMs);
            // Legacy ping (vieux protocol) – peut ne plus marcher sur des serveurs récents
            socket.write(Buffer.from([0xFE, 0x01]));
        });

        socket.once('timeout', () => {
            settle({ online: false, reason: 'idle-timeout' });
        });

        socket.once('error', (err) => {
            settle({ online: false, error: err && (err.code || err.message) });
        });

        socket.once('data', (data) => {
            if (!data || !data.length) return settle({ online: false, reason: 'empty-response' });

            // Parsing "legacy" 0xFE response
            const parts = data.toString().split('\x00\x00\x00');
            if (parts && parts.length >= 6) {
                const res = {
                    online: true,
                    version: parts[2]?.replace(/\u0000/g, ''),
                    motd: parts[3]?.replace(/\u0000/g, ''),
                    onlinePlayers: parts[4]?.replace(/\u0000/g, ''),
                    maxPlayers: parts[5]?.replace(/\u0000/g, ''),
                    dataLength: parts.length
                };
                return settle(res);
            }
            settle({ online: false, reason: 'unexpected-format' });
        });
    });
}

ipcMain.handle("getMemory", () => {
    return {
        "total": os.totalmem(),
        "free": os.freemem()
    }
})

function getGitInfo() {
    try {
        const branch = childProcess
            .execSync('git rev-parse --abbrev-ref HEAD')
            .toString()
            .trim();
        const commit = childProcess
            .execSync('git rev-parse --short HEAD')
            .toString()
            .trim();
        return `${branch}@${commit}`;
    } catch (err) {
        console.warn('Impossible de lire les infos Git :', err);
        return 'git-info-unavailable';
    }
}

ipcMain.handle('getGames', () => {
    let games = [
        { "name": "MCCitizens", "value": "mccitizens", "selected": true }
    ]
    if (isDev) {
        games.push({ "name": "Dev mode", "value": "dev", "selected": (liveServer ? true : false) })
    }
    return games
})
ipcMain.on("setGame", (event, game) => {
    if (game === "dev" && isDev) {
        liveServer = require("live-server");
        liveServer.start({
            port: 5500,
            host: "0.0.0.0",
            root: "./src",
            open: false,
            file: "index.html",
            wait: 1000,
            logLevel: 2,
        });
        mainWindow.loadURL("http://localhost:5500/index.html?payload=" + encodeURIComponent(JSON.stringify(xboxManager.playerData)))
    } else {
        if (liveServer) {
            liveServer.shutdown()
            liveServer = null
            mainWindow.loadFile(path.join(__dirname, "src", "index.html"), {
                query: {
                    payload: encodeURIComponent(JSON.stringify(xboxManager.playerData))
                }
            })
        }
    }
})

ipcMain.handle('getVersion', () => {
    const version = app.getVersion();
    if (isDev) {
        return `${version} (dev) — ${getGitInfo()}`;
    }
    return version;
});

ipcMain.on("java.option.set", (event, config) => {
    if (config.maxRam) {
        store.set("maxRam", config.maxRam)
    }
    if (config.minRam) {
        store.set("minRam", config.minRam)
    }
})

ipcMain.handle("java.option.get", () => {
    return {
        "maxRam": store.get("maxRam") ?? 12,
        "minRam": store.get("minRam") ?? 4,
    }
})

ipcMain.on("mods.get", (event) => {
    const modsDir = path.join(rootPath(), 'mods');
    const disabledDir = path.join(rootPath(), 'disabled-mods');
    const dirs = [modsDir, disabledDir];

    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "workers", 'mods-worker.js'));

        worker.on('message', (modData) => {
            if (modData === null) {
                resolve();
                worker.terminate();
            } else {
                mainWindow && event.sender.send('mod.post', modData);
            }
        });

        worker.on('error', (err) => {
            console.error('Worker erreur:', err);
            reject(err);
        });

        worker.postMessage({ dirs });
    });
})
ipcMain.on("mods.open.folder", () => {
    shell.openPath(path.join(rootPath(), "mods"))
})


ipcMain.on("launcher.option.set", (event, config) => {
    if (Object.prototype.hasOwnProperty.call(config, "quitOnLaunch")) {
        store.set("quitOnLaunch", config.quitOnLaunch)
    }
})
ipcMain.handle("launcher.option.get", () => {
    return {
        "quitOnLaunch": store.get("quitOnLaunch") ?? true,
    }
})

ipcMain.on("profile.load", (event, profile_path) => {
    loadProfile(event, profile_path, mainWindow, xboxManager)
})

ipcMain.on("launch", async () => {
    if (xboxManager.state !== "ready") {
        return
    }

    mainWindow.webContents.send("")

    xboxManager.state = "launch"
    let token = await xboxManager.getMinecraft();
    console.log(`[MCCitizens] Client package ${(isClientPackageInstalled) ? "already" : "not"} installed`);

    /** @type {import("minecraft-launcher-core").ILauncherOptions} */
    let opts = {
        clientPackage: (isClientPackageInstalled) ? null : "https://github.com/pazzazzo/mccitizens-clientpackage/releases/latest/download/clientpackage.zip",
        removePackage: true,
        authorization: token.mclc(),
        root: rootPath(),
        version: {
            number: "1.20.1",
            type: "release"
        },
        memory: {
            max: `${store.get("maxRam") ?? 12}G`,
            min: `${store.get("minRam") ?? 4}G`
        },
        javaPath: path.join(rootPath(), 'java', 'jdk-17.0.11', 'bin', 'java'),
        customLaunchArgs: ["--hydix-token=testing"],
        forge: rootPath() + "/forge.jar"
    };
    function checkClientPackage(cb) {
        if (isClientPackageInstalled) {
            if (mainWindow) {
                mainWindow.webContents.send("mods.sync.start")
            }
            let i = 0
            function checkForLaunch() {
                i++
                if (i === 3) {
                    cb()
                }
            }
            updateMods((p) => {
                if (mainWindow) {
                    mainWindow.webContents.send("mods.sync.progress", p)
                }
            }).then(success => {
                if (mainWindow) {
                    mainWindow.webContents.send("mods.sync.end", success)
                }
                checkForLaunch()
            }).catch((err) => {
                console.error(err)
            })
            checkForLaunch()
            updateKube().then(success => {
                if (mainWindow) {
                    mainWindow.webContents.send("kube.sync.end", success)
                }
                checkForLaunch()
            }).catch((err) => {
                console.error(err)
            })
        } else {
            cb()
        }
    }
    function checkJava(cb) {
        if (!fs.existsSync(path.join(rootPath(), "java"))) {
            if (!fs.existsSync(rootPath())) {
                fs.mkdirSync(rootPath())
            }
            installJDK(p => {
                if (mainWindow) {
                    mainWindow.webContents.send("java.install.progress", p)
                }
            }).then(r => {
                if (r.success) {
                    cb()
                } else if (mainWindow) {
                    mainWindow.webContents.send("java.install.error", r.error)
                }
            }).catch(e => {
                console.error(e)
                if (mainWindow) {
                    mainWindow.webContents.send("java.install.error", e)
                }
            })
        } else {
            cb()
        }
    }
    checkJava(() => {
        checkClientPackage(() => {
            updateIP().then(async () => {
                console.log("Starting!");
                minecraftProc = await launcher.launch(opts);
            })
        })
    })

})

xboxManager.on("state", (s) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("state.change", s)
    }
    buildTray()
})

// launcher.on('debug', (e) => {
//     console.log("[" + "DEGUB".cyan + "] " + e)
// });
launcher.on('data', (e) => {
    // console.log("[" + "DATA".green + "] " + e)

    if ((e.indexOf("Building Processors") >= 0 || e.indexOf("[Render thread/INFO]") >= 0)) {
        xboxManager.state = "launched"
        if (store.has("quitOnLaunch") ? store.get("quitOnLaunch") : true) {
            try {
                mainWindow.close()
                // eslint-disable-next-line no-unused-vars
            } catch (e) { /* empty */ }
        }
    }
});
launcher.on("close", (c, sig) => {
    xboxManager.state = "ready"
    minecraftProc = null
    console.log(`minecraft exit (code: ${c} sig: ${sig})`);
})
launcher.on("progress", (e) => {
    // console.log('[' + 'PROGRESS'.yellow + '] ', e);

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("progress.status", e)
    }
})
launcher.on("package-extract", () => {
    store.set("installed", process.env.INSTALL_REV)
    // console.log('[' + 'PACKAGE EXTRACTED'.green + ']');
})
// launcher.on("download", (e) => {
//     console.log('[' + 'DOWNLOAD'.magenta + '] ', e);
// })
launcher.on("download-status", (e) => {
    // console.log('[' + 'DOWNLOAD-STATUS'.cyan + '] ', e);

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("download.status", e)
    }
})