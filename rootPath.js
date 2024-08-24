const appdata = require("./appdata");
const isdev = require("./isdev");


function rootPath() {
    return isdev ? __dirname + "/.mccitizens" : appdata + "/.mccitizens"
}

module.exports = rootPath