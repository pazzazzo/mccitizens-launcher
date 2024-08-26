const axios = require('axios');
const fs = require('fs');
const path = require('path');
const rootPath = require('./rootPath');

// URLs et chemins
const GITHUB_API_URL = 'https://api.github.com/repos/pazzazzo/mccitizens-clientpackage/contents/mods';
const LOCAL_MODS_DIR = path.join(rootPath(), 'mods');

// Fonction pour s'assurer que le répertoire existe
function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Fonction pour obtenir la liste des fichiers locaux
function getLocalMods() {
    ensureDirectoryExists(LOCAL_MODS_DIR)
    return fs.readdirSync(LOCAL_MODS_DIR);
}

// Fonction pour obtenir la liste des fichiers sur GitHub
async function getRemoteMods() {
    const response = await axios.get(GITHUB_API_URL);
    return response.data.map(file => file.name);
}

// Fonction pour télécharger un fichier
async function downloadFile(url, dest, cb) {
    const writer = fs.createWriteStream(dest);
    
    // Commencez par obtenir la taille totale du fichier
    const response = await axios.get(url, { responseType: 'stream' });
    const totalLength = response.headers['content-length'];

    console.log('Starting download...');

    // Variables pour le suivi de la progression
    let downloadedLength = 0;

    // Surveiller les données entrantes pour suivre la progression
    response.data.on('data', (chunk) => {
        downloadedLength += chunk.length;
        const percent = ((downloadedLength / totalLength) * 100).toFixed(2);
        cb(percent)
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}


async function updateMods(cb) {
    try {
        const localMods = getLocalMods();
        const remoteMods = await getRemoteMods();

        // Identifier les mods à supprimer
        const modsToDelete = localMods.filter(mod => !remoteMods.includes(mod));

        // Supprimer les mods obsolètes
        for (const mod of modsToDelete) {
            cb({ "type": "delete", "file": mod, "index": modsToDelete.indexOf(mod) +1, "total": modsToDelete.length })
            fs.unlinkSync(path.join(LOCAL_MODS_DIR, mod));
            console.log(`Deleted: ${mod}`);
        }

        // Identifier les mods à télécharger
        const modsToDownload = remoteMods.filter(mod => !localMods.includes(mod));

        // Télécharger les nouveaux mods
        for (const mod of modsToDownload) {
            cb({ "type": "download", "file": mod, "index": modsToDownload.indexOf(mod) +1, "total": modsToDownload.length })
            const fileUrl = `https://raw.githubusercontent.com/pazzazzo/mccitizens-clientpackage/main/mods/${mod}`;
            const destPath = path.join(LOCAL_MODS_DIR, mod);
            await downloadFile(fileUrl, destPath, (p) => {
                cb({ "type": "download", "file": mod, "index": modsToDownload.indexOf(mod) +1, "total": modsToDownload.length, "percent": p })
            });
            console.log(`Downloaded: ${mod}`);
        }

        console.log('Mods synchronization complete.');
        return true

    } catch (error) {
        console.error('Error during mods synchronization:', error);
        return false
    }
}
module.exports = updateMods
