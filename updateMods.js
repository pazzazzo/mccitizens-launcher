const axios = require('axios');
const fs = require('fs');
const path = require('path');

// URLs et chemins
const GITHUB_API_URL = 'https://api.github.com/repos/pazzazzo/mccitizens-clientpackage/contents/mods';
const LOCAL_MODS_DIR = path.join(__dirname, ".mccitizens", 'mods');

// Fonction pour obtenir la liste des fichiers locaux
function getLocalMods() {
    return fs.readdirSync(LOCAL_MODS_DIR);
}

// Fonction pour obtenir la liste des fichiers sur GitHub
async function getRemoteMods() {
    const response = await axios.get(GITHUB_API_URL);
    return response.data.map(file => file.name);
}

// Fonction pour télécharger un fichier
async function downloadFile(url, dest) {
    const writer = fs.createWriteStream(dest);
    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function updateMods() {
    try {
        const localMods = getLocalMods();
        const remoteMods = await getRemoteMods();

        // Identifier les mods à supprimer
        const modsToDelete = localMods.filter(mod => !remoteMods.includes(mod));

        // Supprimer les mods obsolètes
        for (const mod of modsToDelete) {
            fs.unlinkSync(path.join(LOCAL_MODS_DIR, mod));
            console.log(`Deleted: ${mod}`);
        }

        // Télécharger les nouveaux mods
        for (const remoteMod of remoteMods) {
            if (!localMods.includes(remoteMod)) {
                const fileUrl = `https://raw.githubusercontent.com/pazzazzo/mccitizens-clientpackage/main/mods/${remoteMod}`;
                const destPath = path.join(LOCAL_MODS_DIR, remoteMod);
                await downloadFile(fileUrl, destPath);
                console.log(`Downloaded: ${remoteMod}`);
            }
        }

        console.log('Mods synchronization complete.');
        return true

    } catch (error) {
        console.error('Error during mods synchronization:', error);
        return false
    }
}
module.exports = updateMods
