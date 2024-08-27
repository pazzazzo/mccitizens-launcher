const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const unzipper = require('unzipper'); // Pour extraire les .zip
const tar = require('tar'); // Pour extraire les .tar.gz
const rootPath = require('./rootPath');

// Détection du système d'exploitation
const platform = os.platform(); // 'win32', 'darwin', 'linux'

let MAX_RETRIES = 10;
let RETRY_DELAY = 2000;

const jdkUrls = {
    win32: 'https://download.oracle.com/java/17/archive/jdk-17.0.11_windows-x64_bin.zip',
    darwin: 'https://download.oracle.com/java/17/archive/jdk-17.0.11_macos-x64_bin.tar.gz',
    linux: 'https://download.oracle.com/java/17/archive/jdk-17.0.11_linux-x64_bin.tar.gz'
};

// Chemins
const downloadDir = path.join(rootPath(), 'java');
const downloadPath = path.join(downloadDir, `jdk.${platform === "win32" ? "zip" : "tar.gz"}`); // Changez à .tar.gz si nécessaire

// Fonction pour télécharger un fichier avec affichage de la progression
async function downloadFile(url, dest, cb, retries = MAX_RETRIES) {
    const file = fs.createWriteStream(dest);

    const dl = async () => {
        try {
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
            });

            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;

            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const percentage = ((downloadedBytes / totalBytes) * 100).toFixed(2);
                cb(percentage);
            });

            response.data.pipe(file);

            response.data.on("error", (e) => {
                console.log(e);
                
            })

            return new Promise((resolve, reject) => {
                file.on('finish', () => {
                    console.log('Download complete');
                    resolve();
                });

                file.on('error', (e) => {
                    console.log("e");
                    
                    throw e
                });
            });
        } catch (err) {
            if (retries > 0) {
                console.error(`Download failed: ${err.message}. Retrying...`);
                setTimeout(() => dl(), RETRY_DELAY);
            } else {
                throw new Error(`Failed to download file after ${MAX_RETRIES} attempts.`);
            }
        }
    };

    return dl();
}

// Fonction pour extraire un fichier .zip
function extractZip(src, dest) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(src)
            .pipe(unzipper.Extract({ path: dest }))
            .on('finish', resolve)
            .on('error', reject);
    });
}

// Fonction pour extraire un fichier .tar.gz
function extractTarGz(src, dest) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(src)
            .pipe(tar.extract({ cwd: dest }))
            .on('finish', resolve)
            .on('error', reject);
    });
}

// Fonction pour installer le JDK
async function installJDK(cb) {
    try {
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        const jdkUrl = jdkUrls[platform];
        if (!jdkUrl) {
            throw new Error(`Unsupported platform ${platform}`);
        }

        console.log(`Downloading JDK from ${jdkUrl}`);
        await downloadFile(jdkUrl, downloadPath, cb);

        if (platform === 'win32') {
            console.log('Extracting JDK (ZIP)');
            await extractZip(downloadPath, downloadDir);
        } else {
            console.log('Extracting JDK (TAR.GZ)');
            await extractTarGz(downloadPath, downloadDir);
        }

        // Nettoyer
        fs.unlinkSync(downloadPath);

        console.log('JDK installation complete');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error };
    }
}

module.exports = installJDK;