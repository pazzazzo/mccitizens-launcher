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
const updateKube = require("./updateKube");
const { autoUpdater } = require('electron-updater');
const rootPath = require("./rootPath");
const Store = require('electron-store');
const fs = require("fs");
const installJDK = require("./installJDK");
const getModData = require("./getModData");
const isClientPackageInstalled = require("./isClientPackageInstalled");
console.log(app.getPath('userData'));

let mainWindow;
let profile;
let store = new Store()

const launcher = new Client();
const authManager = new Auth("select_account");
let xbox;

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
        }
    })
    mainWindow.loadFile(__dirname + '/src/home/index.html')
    mainWindow.on("ready-to-show", () => {
        mainWindow.show()
    })

    // Vérification des mises à jour
    autoUpdater.checkForUpdatesAndNotify();
}

autoUpdater.on('update-available', () => {
    console.log("Update");
    if (mainWindow) {
        mainWindow.loadFile(__dirname + '/src/update/index.html')
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
ipcMain.handle("getVersion", (e) => {
    return app.getVersion()
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
ipcMain.on("mods.get", (event) => {
    fs.readdir(path.join(rootPath(), "mods"), (err, files) => {
        files.forEach(file => {
            event.reply("mod.post", getModData(path.join(rootPath(), "mods", file)))
        })
    })
})

ipcMain.on("launcher.option.set", (event, config) => {
    if (Object.prototype.hasOwnProperty.call(config, "quitOnLaunch")) {
        store.set("quitOnLaunch", config.quitOnLaunch)
    }
})
ipcMain.handle("launcher.option.get", (e) => {
    return {
        "quitOnLaunch": store.has("quitOnLaunch") ? store.get("quitOnLaunch") : true,
    }
})

ipcMain.on("profile.load", (event) => {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', "showHiddenFiles"],
        "buttonLabel": "Import",
        "defaultPath": AppData + "/.modpack",
    }).then(r => {
        console.log(r);
        let pth = r.filePaths[0]
        if (pth) {
            try {
                if (fs.existsSync(pth + "/options.txt")) {
                    if (!fs.existsSync(rootPath())) {
                        fs.mkdirSync(rootPath(), { recursive: true });
                    }
                    function move(file) {
                        if (fs.existsSync(pth + "/" + file)) {
                            fs.copyFileSync(pth + "/" + file, rootPath() + "/" + file)
                        }
                    }
                    function copyDirectory(src, dest) {
                        console.log(src);

                        if (!fs.existsSync(src)) {
                            console.error(`Source directory ${src} does not exist.`);
                            return;
                        }

                        if (!fs.existsSync(dest)) {
                            fs.mkdirSync(dest, { recursive: true });
                        }

                        fs.readdirSync(src).forEach((item) => {
                            const srcPath = path.join(src, item);
                            const destPath = path.join(dest, item);

                            if (fs.lstatSync(srcPath).isDirectory()) {
                                copyDirectory(srcPath, destPath); // Recursively copy subdirectories
                            } else {
                                console.log(srcPath);

                                fs.copyFileSync(srcPath, destPath); // Copy files
                            }
                        });
                    }
                    function copyDir(name) {
                        const src = pth + "/" + name
                        const dest = rootPath() + "/" + name
                        copyDirectory(src, dest)
                    }
                    move("options.txt")
                    copyDir("defaultconfigs")
                    copyDir("XaeroWaypoints")
                    move("optionsof.txt")
                    copyDir("XaeroWorldMap")
                    copyDir("resourcepacks")
                    copyDir("shaderpacks")
                    copyDir("schematics")
                    copyDir("config")
                    copyDir("saves")
                    event.reply("profile.load.status", true)
                } else {
                    event.reply("profile.load.status", false, "Not a profile forlder")
                }
            } catch (error) {
                event.reply("profile.load.status", false, error)
            }
        }
    })
})

ipcMain.on("launch", async () => {
    if (!xbox) {
        return
    }
    let token = await xbox.getMinecraft();
    console.log(`[MCCitizens] Client package ${(isClientPackageInstalled) ? "already" : "not"} installed`);

    let opts = {
        clientPackage: (isClientPackageInstalled) ? null : "https://github.com/pazzazzo/mccitizens-clientpackage/releases/latest/download/clientpackage.zip",
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
        javaPath: path.join(rootPath(), 'java', 'jdk-17.0.11', 'bin', 'java'),
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
                if (i === 2) {
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
            console.log("Starting!");
            launcher.launch(opts);
        })
    })

})

launcher.on('debug', (e) => {
    console.log("[" + "DEGUB".cyan + "] " + e)
});
launcher.on('data', (e) => {
    console.log("[" + "DATA".green + "] " + e)

    if (e.indexOf("Building Processors") >= 0 && (store.has("quitOnLaunch") ? store.get("quitOnLaunch") : true)) {
        app.quit()
    }
});
launcher.on("close", (c) => {
    console.log(`minecraft exit (${c})`);
})
launcher.on("progress", (e) => {
    console.log('[' + 'PROGRESS'.yellow + '] ', e); //task/total

    if (mainWindow) {
        mainWindow.webContents.send("progress.status", e)
    }
})
launcher.on("package-extract", (e) => {
    store.set("installed", true)
    console.log('[' + 'PACKAGE EXTRACTED'.green + ']');
})
launcher.on("download", (e) => {
    console.log('[' + 'DOWNLOAD'.magenta + '] ', e);
})
launcher.on("download-status", (e) => {
    console.log('[' + 'DOWNLOAD-STATUS'.cyan + '] ', e); //current/total - name

    if (mainWindow) {
        mainWindow.webContents.send("download.status", e)
    }
})