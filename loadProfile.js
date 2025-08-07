const os = require("os");
const fs = require("fs");
const path = require("path");
const appdata = require("./appdata");
const { dialog } = require("electron");
const { Worker } = require("worker_threads");

module.exports = function (event, profile_path, mainWindow, xboxManager) {
    if (profile_path) {
        processTransfer(profile_path)
    } else {
        let userProfile = path.join(os.homedir(), "curseforge", "minecraft", "Instances", xboxManager.profile?.name || "")
        if (!fs.existsSync(userProfile)) {
            userProfile = path.join(os.homedir(), "curseforge", "minecraft", "Instances")
        }
        if (!fs.existsSync(userProfile)) {
            userProfile = appdata
        }
        dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', "showHiddenFiles"],
            "buttonLabel": "Import",
            "defaultPath": userProfile,
        }).then(r => {
            let pth = r.filePaths[0]
            processTransfer(pth)
        })
    }

    /**
     * 
     * @param {string} pth 
     * @returns 
     */
    function processTransfer(pth) {
        const worker = new Worker(path.join(__dirname, "workers", 'import-profile-worker.js'));

        worker.on('message', (data) => {
            if (data === null) {
                worker.terminate();
            }
            event.sender.send('profile.load.status', data);
        });

        worker.on('error', (err) => {
            console.error('Worker erreur:', err);
        });

        worker.postMessage({ pth });
    }
}