const os = require('os');
const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper'); // Assurez-vous d'avoir installé ce module pour extraire les .zip
const tar = require('tar'); // Pour extraire les .tar.gz
const { exec } = require('child_process');
const rootPath = require('./rootPath');

// Détection du système d'exploitation
const platform = os.platform(); // 'win32', 'darwin', 'linux'

let MAX_RETRIES = 10
let RETRY_DELAY = 2000

const jdkUrls = {
    win32: 'https://download.oracle.com/java/17/archive/jdk-17.0.11_windows-x64_bin.zip',
    darwin: 'https://download.oracle.com/java/17/archive/jdk-17.0.11_macos-x64_bin.tar.gz',
    linux: 'https://download.oracle.com/java/17/archive/jdk-17.0.11_linux-x64_bin.tar.gz'
};

// Chemins
const downloadDir = path.join(rootPath(), 'java');
const downloadPath = path.join(downloadDir, `jdk.${platform === "win32" ? "zip" : "tar.gz"}`); // Changez à .tar.gz si nécessaire

// Fonction pour télécharger un fichier avec affichage de la progression
function downloadFile(url, dest, cb, retries = MAX_RETRIES) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const dl = (cberr) => {
            if (fs.existsSync(dest)) {
                fs.unlinkSync(dest)
            }
            https.get(url, response => {
                const totalBytes = parseInt(response.headers['content-length'], 10);
                let downloadedBytes = 0;

                response.pipe(file);

                response.on('data', chunk => {
                    downloadedBytes += chunk.length;
                    const percentage = ((downloadedBytes / totalBytes) * 100).toFixed(2);
                    // process.stdout.write(`JDK downloading: ${percentage}%\r`);
                    cb(percentage)
                });

                response.on('end', () => {
                    console.log('Download complete');
                    file.close(resolve);
                });

                response.on('error', err => {
                    console.error(err)
                });

            }).on('error', err => {
                console.error(err)
                cberr(err)
            });
        }

        // Réessayer en cas d'échec
        const attemptDownload = (attempts) => {
            if (attempts <= 0) {
                return reject(new Error('Failed to download file after multiple attempts.'));
            }
            dl((err) => {
                console.error(`Download failed: ${err.message}. Retrying...`);
                setTimeout(() => attemptDownload(attempts - 1), RETRY_DELAY);
            });
        };

        attemptDownload(retries);
    });
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
            return { success: false, error: new Error(`Unsupported platform ${platform}`) }
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

        return { success: true }

    } catch (error) {
        console.error(error)
        return { success: false, error }
    }
}

module.exports = installJDK