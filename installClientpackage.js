const fs = require('fs');
const path = require('path');
const axios = require('axios');
const tar = require('tar'); // Pour extraire les .tar.gz
const unzipper = require('unzipper'); // Pour extraire les .zip
const rootPath = require('./rootPath');
const request = require("request");


let MAX_RETRIES = 10;
let RETRY_DELAY = 2000;

// Chemins
const downloadDir = path.join(rootPath());
const downloadPath = path.join(rootPath(), "clientpackage.zip");

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

function extractTarGz(src, dest) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(src)
            .pipe(tar.extract({ cwd: dest }))
            .on('finish', resolve)
            .on('error', reject);
    });
}

async function installClientpackage(cb) {
    try {
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        const url = "https://github.com/pazzazzo/mccitizens-clientpackage/releases/latest/download/clientpackage.zip"

        console.log(`Downloading clientpackage from ${url}`);
        await downloadFile(url, downloadPath, cb);

        // console.log('Extracting clientpackage (ZIP)');
        // await extractTarGz(downloadPath, downloadDir);

        const res = await unzipper.Open.url(request, url)
        await res.extract({ path: downloadDir })

        // fs.unlinkSync(downloadPath);

        console.log('clientpackage installation complete');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error };
    }
}

module.exports = installClientpackage;