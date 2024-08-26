const axios = require('axios');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const rootPath = require('./rootPath');

// URL de l'API GitHub pour la dernière release
const GITHUB_RELEASE_API_URL = 'https://api.github.com/repos/pazzazzo/mccitizens-clientpackage/releases/latest';
// Chemins locaux
const TEMP_ZIP_PATH = path.join(rootPath(), 'kubejs-temp.zip');

// Fonction pour télécharger la dernière release
async function downloadLatestRelease() {
    try {
        // Obtenir les informations sur la dernière release
        const releaseResponse = await axios.get(GITHUB_RELEASE_API_URL);
        const zipAsset = releaseResponse.data.assets.find(asset => asset.name === 'kubejs.zip');
        
        if (!zipAsset) {
            throw new Error('Release asset kubejs.zip not found.');
        }

        // Télécharger le fichier ZIP
        const downloadResponse = await axios.get(zipAsset.browser_download_url, { responseType: 'stream' });
        const writer = fs.createWriteStream(TEMP_ZIP_PATH);

        downloadResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading the latest release:', error);
        throw error;
    }
}

// Fonction pour extraire le fichier ZIP
async function extractZip() {
    try {
        await fs.createReadStream(TEMP_ZIP_PATH)
            .pipe(unzipper.Extract({ path: rootPath() }))
            .promise();

        console.log('Extraction completed.');
    } catch (error) {
        console.error('Error extracting ZIP file:', error);
        throw error;
    }
}

// Fonction pour supprimer l'ancien contenu du répertoire kubejs
function clearKubejsDirectory() {
    if (fs.existsSync(path.join(rootPath(), "kubejs"))) {
        fs.rmSync(path.join(rootPath(), "kubejs"), { recursive: true });
    }
    fs.mkdirSync(path.join(rootPath(), "kubejs"), { recursive: true });
}

// Synchroniser kubejs
async function syncKubejs() {
    try {
        console.log('Starting kubejs synchronization...');

        // Supprimer l'ancien contenu de kubejs
        clearKubejsDirectory();

        // Télécharger la dernière release
        await downloadLatestRelease();
        console.log('Download completed.');

        // Extraire le fichier ZIP
        await extractZip();

        // Supprimer le fichier ZIP temporaire
        fs.unlinkSync(TEMP_ZIP_PATH);
        console.log('Temporary ZIP file deleted.');

        console.log('kubejs synchronization complete.');
        return true
    } catch (error) {
        console.error('Error during kubejs synchronization:', error);
    }
}

module.exports = syncKubejs;
