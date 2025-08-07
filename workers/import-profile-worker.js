const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const rootPath = require('../rootPath');

parentPort.on('message', ({ pth }) => {
    if (pth) {
        if (!fs.existsSync(pth)) {
            parentPort.postMessage({ type: "fail", error: "Path inexistant" });
            return parentPort.postMessage(null);
        } else if (!fs.statSync(pth).isDirectory()) {
            parentPort.postMessage({ type: "fail", error: "Not a profile forlder" });
            return parentPort.postMessage(null);
        }
        try {
            if (fs.existsSync(path.join(pth, "options.txt"))) {
                if (!fs.existsSync(rootPath())) {
                    fs.mkdirSync(rootPath(), { recursive: true });
                }
                function move(file) {
                    if (fs.existsSync(path.join(pth, file))) {
                        fs.copyFileSync(path.join(pth, file), path.join(rootPath(), file))
                        tellMove(file)
                    }
                }
                function copyDirectory(src, dest) {
                    if (!fs.existsSync(src)) {
                        parentPort.postMessage({ type: "fail", error: `${src.replace(pth, "")} unreachable` });
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
                            tellMove(srcPath)
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
                copyDir("screenshots")
                copyDir("saves")
                parentPort.postMessage(null);
            } else {
                parentPort.postMessage({ type: "fail", error: "Not a profile forlder" });
                parentPort.postMessage(null);
            }

            function tellMove(p) {
                parentPort.postMessage({ type: "work", path: p.replace(pth, "") });
            }
        } catch (error) {
            parentPort.postMessage({ type: "fail", error });
            parentPort.postMessage(null);
        }
    }
});