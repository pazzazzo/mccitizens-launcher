const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const rootPath = require('./rootPath');




async function updateServer(ip) {
    const NBT = await import('nbtify');
    const filePath = path.join(rootPath(), 'servers.dat');

    // Lecture du fichier server.dat (gzipped NBT)
    fs.readFile(filePath, async (err, data) => {
        if (err) {
            console.error('Erreur de lecture :', err);
            process.exit(1);
        }

        // Parse le NBT, détecte automatiquement la compression gzip

        const nbtData = await NBT.read(data)
        nbtData.data.servers[0].ip = ip
        const parsedData = await NBT.write(nbtData)

        fs.writeFile(filePath, parsedData, (writeFileErr) => {
            if (writeFileErr) {
                console.error("Erreur d'écriture de servers.dat :", writeFileErr);
                process.exit(1);
            }
            console.log('✅ Fichier servers.dat mis à jour avec succès !');
        });
    });
}

module.exports = updateServer