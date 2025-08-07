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
    return fs.readdirSync(LOCAL_MODS_DIR).map(name => {
        let stats = fs.statSync(path.join(LOCAL_MODS_DIR, name))
        let size = stats.size;
        return { name, size }
    })
}

// Fonction pour obtenir la liste des fichiers sur GitHub
async function getRemoteMods() {
    const response = await axios.get(GITHUB_API_URL);

    return response.data.map(file => { return { name: file.name, size: file.size } });
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
        console.log(remoteMods);


        // Identifier les mods à supprimer
        const modsToDelete = localMods.filter(mod => !remoteMods.some(rmod => (mod.name === rmod.name && mod.size === rmod.size)));

        // Supprimer les mods obsolètes
        for (const mod of modsToDelete) {
            let modStat = fs.statSync(path.join(LOCAL_MODS_DIR, mod.name))
            if (!modStat.isDirectory()) {
                cb({ "type": "delete", "file": mod, "index": modsToDelete.indexOf(mod) + 1, "total": modsToDelete.length })
                fs.unlinkSync(path.join(LOCAL_MODS_DIR, mod.name));
                console.log(`Deleted: ${mod.name}`);
            }
        }

        // Identifier les mods à télécharger
        const modsToDownload = remoteMods.filter(mod => !localMods.some(lmod => (mod.name === lmod.name && mod.size === lmod.size)));

        // Télécharger les nouveaux mods
        const concurrencyLimit = 3;
        let activeCount = 0;
        let passedCount = 0;
        let currentIndex = 0;

        async function next() {
            // Si on a traité tous les mods à télécharger...
            if (currentIndex >= modsToDownload.length) {
                // ...et qu'il n'en reste aucun en cours, on termine.
                if (activeCount === 0) {
                    return;
                }
                // Sinon on attend la fin des en cours.
                return;
            }

            // Si on est déjà à la limite de concurrence, on recule
            if (activeCount >= concurrencyLimit) {
                return;
            }

            // On récupère le mod suivant
            const mod = modsToDownload[currentIndex];
            currentIndex++;
            activeCount++;

            // Callback de départ à 0%
            typeof cb === 'function' && cb({
                type: 'download',
                file: mod.name,
                percent: 0
            });

            const fileUrl = `https://raw.githubusercontent.com/pazzazzo/mccitizens-clientpackage/main/mods/${mod.name}`;
            const destPath = path.join(LOCAL_MODS_DIR, mod.name);

            try {
                // On attend la fin du téléchargement avant de continuer
                await downloadFile(fileUrl, destPath, (p) => {
                    typeof cb === 'function' && cb({
                        type: 'download',
                        file: mod.name,
                        total: modsToDownload.length,
                        percent: p
                    });
                });
                console.log(`Downloaded: ${mod.name}`);
            } catch (err) {
                console.error(`Erreur sur ${mod.name}:`, err);
            } finally {
                // Une fois terminé (succès ou échec), on libère une place
                activeCount--;
                passedCount++;
                typeof cb === 'function' && cb({
                    type: 'download',
                    index: passedCount,
                    total: modsToDownload.length,
                });
                // Et on lance le prochain téléchargement si besoin
                await next();
            }
        }


        const starters = [];
        for (let i = 0; i < concurrencyLimit; i++) {
            starters.push(next());
        }

        await Promise.all(starters);

        console.log('Mods synchronization complete.');
        return true

    } catch (error) {
        console.error('Error during mods synchronization:', error);
        return false
    }
}

module.exports = updateMods
