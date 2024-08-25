require("colors")
const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron')
const path = require('path')
const { Client } = require("minecraft-launcher-core");
const { Auth } = require("msmc");
const net = require('net')
const os = require("os")
const isDev = require("./isdev")
const AppData = require("./appdata");
const updateMods = require("./updateMods");
const { autoUpdater } = require('electron-updater');
const rootPath = require("./rootPath");
const Store = require('electron-store');
console.log(app.getPath('userData'));

let mainWindow;
let profile;
let store = new Store()

const launcher = new Client();
const authManager = new Auth("select_account");
let xbox;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 1250,
        minHeight: 758,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "src", 'preload.js'),
        }
    })

    mainWindow.loadFile(__dirname + '/src/home/index.html')

    // Vérification des mises à jour
    autoUpdater.checkForUpdatesAndNotify();
}

autoUpdater.on('update-available', () => {
    console.log("Update");

    // dialog.showMessageBox({
    //     type: 'info',
    //     title: 'Mise à jour disponible',
    //     message: 'Une nouvelle version est disponible. Elle sera téléchargée en arrière-plan.',
    // });
    new Notification({
        title: 'MCCitizens Launcher',
        body: 'Nouvelle mise à jour disponible.',
    }).show();
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
    dialog.showMessageBox({
        type: 'info',
        title: 'Mise à jour prête',
        message: "Une nouvelle version a été téléchargée. Voulez-vous redémarrer l'application maintenant?",
        buttons: ['Oui', 'Non'],
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on("auto_connect", (e) => {
    let msAuthToken = store.get("token")
    if (store.has("token") && msAuthToken["access_token"] && msAuthToken["refresh_token"] && !xbox) {
        authManager.refresh(msAuthToken).then(async xboxManager => {
            let mc = await xboxManager.getMinecraft();
            profile = mc.profile
            e.reply("connected", { "skin": profile.skins[0].url, "cape": profile.capes[0]?.url, "head": `https://mc-heads.net/head/${profile.name}/left` }, { "username": profile.name })
            xbox = xboxManager
        }).catch(r => {
            console.log(r);
        })
    } else if (profile) {
        e.reply("connected", { "skin": profile.skins[0].url, "cape": profile.capes[0]?.url, "head": `https://mc-heads.net/head/${profile.name}/left` }, { "username": profile.name })
    } else if (xbox) {
        xbox.getMinecraft().then(mc => {
            profile = mc.profile
            e.reply("connected", { "skin": profile.skins[0].url, "cape": profile.capes[0]?.url, "head": `https://mc-heads.net/head/${profile.name}/left` }, { "username": profile.name })
        }).catch(e => {
            console.log(e);
        })
    } else {
        e.reply("not_connected")
    }
})

ipcMain.on("connect", (e) => {
    let msAuthToken = store.get("token") || {}
    authManager.launch("raw").then(async xboxManager => {
        msAuthToken["access_token"] = xboxManager.msToken.access_token
        msAuthToken["refresh_token"] = xboxManager.msToken.refresh_token
        store.set("token", msAuthToken)
        let mc = await xboxManager.getMinecraft();
        profile = mc.profile
        e.reply("connected", { "skin": profile.skins[0].url, "cape": profile.capes[0]?.url, "head": `https://mc-heads.net/head/${profile.name}/left` }, { "username": profile.name })
        xbox = xboxManager
    }).catch(r => {
        console.log(r);
    })
})
ipcMain.on("reset", (e) => {
    store.clear()
    app.quit()
})
ipcMain.handle("getServerStatus", (event, address, port = 25565) => {
    if (port == null || port == '') {
        port = 25565
    }
    if (typeof port === 'string') {
        port = parseInt(port)
    }
    return new Promise((resolve, reject) => {
        const socket = net.connect(port, address, () => {
            let buff = Buffer.from([0xFE, 0x01])
            socket.write(buff)
        })

        socket.setTimeout(2500, () => {
            socket.end()
            resolve({
                online: false
            })
        })

        socket.on('data', (data) => {
            if (data != null && data != '') {
                let server_info = data.toString().split('\x00\x00\x00')
                const NUM_FIELDS = 6
                if (server_info != null && server_info.length >= NUM_FIELDS) {
                    resolve({
                        online: true,
                        version: server_info[2].replace(/\u0000/g, ''),
                        motd: server_info[3].replace(/\u0000/g, ''),
                        onlinePlayers: server_info[4].replace(/\u0000/g, ''),
                        maxPlayers: server_info[5].replace(/\u0000/g, '')
                    })
                    console.log(server_info);
                } else {
                    resolve({
                        online: false
                    })
                }
            }
            socket.end()
        })

        socket.on('error', (err) => {
            console.log(err);
            resolve({
                online: false
            })
        })
    })
})
ipcMain.handle("getMemory", (e) => {
    return {
        "total": os.totalmem(),
        "free": os.freemem()
    }
})
ipcMain.handle("getVersion", async (e) => {
    return await app.getVersion()
})

ipcMain.on("java.option.set", (event, config) => {
    if (config.maxRam) {
        store.set("maxRam", config.maxRam)
    }
    if (config.minRam) {
        store.set("minRam", config.minRam)
    }
})
ipcMain.handle("java.option.get", (e) => {
    return {
        "maxRam": store.get("maxRam") || 12,
        "minRam": store.get("minRam") || 4,
    }
})

ipcMain.on("launch", async () => {
    if (!xbox) {
        return
    }
    let token = await xbox.getMinecraft();
    console.log(`[MCCitizens] Client package ${(store.has("installed") && store.get("installed")) ? "already" : "not"} installed`);
    if (store.has("installed") && store.get("installed")) {
        if (mainWindow) {
            mainWindow.webContents.send("mods.sync.start")
        }
        updateMods().then(success => {
            if (mainWindow) {
                mainWindow.webContents.send("mods.sync.end", success)
            }
        })
    }
    let opts = {
        clientPackage: (store.has("installed") && store.get("installed")) ? null : "https://github.com/pazzazzo/mccitizens-clientpackage/releases/download/v0.0.1-alpha/clientpackage.zip",
        removePackage: true,
        // Simply call this function to convert the msmc Minecraft object into a mclc authorization object
        authorization: token.mclc(),
        root: rootPath(),
        version: {
            number: "1.20.1",
            type: "release"
        },
        memory: {
            max: `${store.get("maxRam") || 12}G`,
            min: `${store.get("minRam") || 4}G`
        },
        forge: rootPath() + "/forge.jar",
        jvmOptions: [
            '-Djava.awt.headless=true'
        ]

        // javaPath: "C:\\Program Files\\Java\\jdk-17\\bin\\java"
        // javaPath: process.env.JAVA_HOME + "\\bin\\java"
        // javaPath: __dirname + "/jdk-17/bin/java"
    };
    console.log("Starting!");
    launcher.launch(opts);
})

launcher.on('debug', (e) => console.log("[" + "DEGUB".cyan + "] " + e));
launcher.on('data', (e) => console.log("[" + "DATA".green + "] " + e));
launcher.on("close", (c) => {
    console.log(`minecraft exit (${c})`);
})
launcher.on("progress", (e) => {
    console.log('[' + 'PROGRESS'.yellow + '] ', e);
})
launcher.on("package-extract", (e) => {
    store.set("installed", true)
    saveData()
    console.log('[' + 'PACKAGE EXTRACTED'.green + ']');
})
launcher.on("download", (e) => {
    console.log('[' + 'DOWNLOAD'.magenta + '] ', e);
})
launcher.on("download-status", (e) => {
    console.log('[' + 'DOWNLOAD-STATUS'.cyan + '] ', e);

    if (mainWindow) {
        mainWindow.webContents.send("download.status", e)
    }
})