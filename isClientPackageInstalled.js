const fs = require("fs");
const Store = require('electron-store');
const path = require('path')
const rootPath = require("./rootPath");
const store = new Store()

module.exports = (fs.existsSync(path.join(rootPath(), "forge.jar")) && store.has("installed") && store.get("installed"))