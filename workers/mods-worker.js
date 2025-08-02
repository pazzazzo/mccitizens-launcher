const { parentPort } = require('worker_threads');
const fs             = require('fs');
const path           = require('path');
const getModData = require("../getModData");

parentPort.on('message', ({ dirs }) => {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const data = getModData(path.join(dir, file));
      parentPort.postMessage(data);
    }
  }
  parentPort.postMessage(null);
});