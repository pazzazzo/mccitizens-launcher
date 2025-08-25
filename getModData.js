const AdmZip = require('adm-zip');
const toml = require('toml');
const fs = require('fs');

function getModData(jarFilePath) {
    try {
        if (!fs.existsSync(jarFilePath)) {
            return
        }
        if (fs.statSync(jarFilePath).isDirectory()) {
            return
        }
        // Chargement du fichier .jar
        let zip
        try {
            zip = new AdmZip(jarFilePath);
        } catch {
            return
        }

        // Recherche du fichier mods.toml dans META-INF
        const modsTomlEntry = zip.getEntry('META-INF/mods.toml');

        if (modsTomlEntry) {
            // Lecture du contenu de mods.toml
            const modsTomlContent = modsTomlEntry.getData().toString('utf8');
            const parsedToml = toml.parse(modsTomlContent);

            // Récupération des informations souhaitées
            const modInfo = parsedToml.mods ? parsedToml.mods[0] : null;
            if (modInfo) {
                const { logoFile } = modInfo;

                // Convertir le logo en Base64 si un logoFile est spécifié
                if (logoFile) {
                    const logoBase64 = extractAndConvertLogoToBase64(zip, logoFile);
                    return { ...modInfo, logoBase64 }
                }
                return { ...modInfo }
            }
        }
    } catch (error) {
        console.error('Erreur lors de la lecture du fichier .jar:', error);
    }
}

function extractAndConvertLogoToBase64(zip, logoFile) {
    try {
        // Recherche du fichier logo dans l'archive
        const logoEntry = zip.getEntry(logoFile);
        if (logoEntry) {
            const logoData = logoEntry.getData();
            // Convertir en Base64
            return logoData.toString('base64');
        } else {
            return null;
        }
    } catch (error) {
        console.error('Erreur lors de l\'extraction du logo :', error);
        return null;
    }
}

module.exports = getModData