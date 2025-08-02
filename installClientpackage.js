const fs = require('fs');
const path = require('path');
const axios = require('axios');
const tar = require('tar');
const unzipper = require('unzipper');
const rootPath = require('./rootPath');
const request = require("request");


let MAX_RETRIES = 10;
let RETRY_DELAY = 2000;

const downloadDir = path.join(rootPath());
const downloadPath = path.join(rootPath(), "clientpackage.zip");

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

async function extractZip(src, dest) {
    const directory = await unzipper.Open.file(src);
    await directory.extract({ path: dest });
}

async function installClientpackage(cb) {
    try {
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        const url = "https://github.com/pazzazzo/mccitizens-clientpackage/releases/latest/download/clientpackage.zip"

        console.log(`Downloading clientpackage from ${url}`);
        await downloadFile(url, downloadPath, cb);
        cb(100)

        console.log('Extracting clientpackage (ZIP)');
        await extractZip(downloadPath, downloadDir);

        console.log('clientpackage installation complete');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error };
    }
}

module.exports = installClientpackage;