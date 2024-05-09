require("colors")
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { Client } = require("minecraft-launcher-core");
const { Auth } = require("msmc");
const fs = require("fs")
const net = require('net')
const os = require("os")
const isDev = require("./isdev")
const AppData = require("./appdata")

const data = JSON.parse(fs.readFileSync(__dirname + "/data.json").toString())
function saveData() {
    fs.writeFileSync(__dirname + "/data.json", JSON.stringify(data))
}

const launcher = new Client();
const authManager = new Auth("select_account");
let xbox;

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 1250,
        minHeight: 758,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "src", 'preload.js'),
        }
    })

    mainWindow.loadFile('src/home/index.html')

}

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
    let msAuthToken = JSON.parse(fs.readFileSync(__dirname + "/token.json").toString())
    if (msAuthToken["access_token"] && msAuthToken["refresh_token"] && !xbox) {
        authManager.refresh(msAuthToken).then(async xboxManager => {
            let mc = await xboxManager.getMinecraft();
            e.reply("connected", { "skin": mc.profile.skins[0].url, "cape": mc.profile.capes[0].url, "head": `https://mc-heads.net/head/${mc.profile.name}/left` }, { "username": mc.profile.name })
            xbox = xboxManager
        }).catch(r => {
            console.log(r);
        })
    } else if (xbox) {
        xbox.getMinecraft().then(mc => {
            e.reply("connected", { "skin": mc.profile.skins[0].url, "cape": mc.profile.capes[0].url, "head": `https://mc-heads.net/head/${mc.profile.name}/left` }, { "username": mc.profile.name })
        })
    } else {
        e.reply("not_connected")
    }
})

ipcMain.on("connect", (e) => {
    let msAuthToken = JSON.parse(fs.readFileSync(__dirname + "/token.json").toString())
    authManager.launch("raw").then(async xboxManager => {
        msAuthToken["access_token"] = xboxManager.msToken.access_token
        msAuthToken["refresh_token"] = xboxManager.msToken.refresh_token
        fs.writeFileSync(__dirname + "/token.json", JSON.stringify(msAuthToken))
        let mc = await xboxManager.getMinecraft();
        e.reply("connected", { "skin": mc.profile.skins[0].url, "cape": mc.profile.capes[0].url, "head": `https://mc-heads.net/head/${mc.profile.name}/left` }, { "username": mc.profile.name })
        xbox = xboxManager
    }).catch(r => {
        console.log(r);
    })
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

ipcMain.on("launch", async () => {
    if (!xbox) {
        return
    }
    let token = await xbox.getMinecraft();
    console.log(`[MCCitizens] Client package ${data.installed ? "already" : "not"} installed`);
    let opts = {
        clientPackage: data.installed ? null : "https://github.com/pazzazzo/mccitizens-clientpackage/releases/download/v0.0.0-alpha/clientpackage.zip",
        removePackage: true,
        // Simply call this function to convert the msmc Minecraft object into a mclc authorization object
        authorization: token.mclc(),
        root: rootPath(),
        version: {
            number: "1.17.1",
            type: "release"
        },
        memory: {
            max: "12G",
            min: "4G"
        },
        forge: rootPath() + "/forge.jar",
        // javaPath: "C:\\Program Files\\Java\\jdk-17\\bin\\java"
        // javaPath: process.env.JAVA_HOME + "\\bin\\java"
        javaPath: __dirname + "/jdk-17/bin/java"
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
    data.installed = true
    saveData()
    console.log('[' + 'PACKAGE EXTRACTED'.green + ']');
})
launcher.on("download", (e) => {
    console.log('[' + 'DOWNLOAD'.magenta + '] ', e);
})
launcher.on("download-status", (e) => {
    console.log('[' + 'DOWNLOAD-STATUS'.cyan + '] ', e);

    mainWindow && mainWindow.webContents.send("download.status", e)
})

function rootPath() {
    return isDev ? __dirname + "\\.mccitizens" : AppData + "\\.mccitizens"
}