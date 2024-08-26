const appdata = require("./appdata");
const isdev = require("./isdev");


function rootPath(forceDev) {
    return (isdev || forceDev) ? __dirname + "/.mccitizens" : appdata + "/.mccitizens"
}

module.exports = rootPath