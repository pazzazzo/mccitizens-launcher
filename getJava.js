const unzipper = require("unzipper");
const path = require("path");
const request = require("request");

(async () => {

    const zip = "https://github.com/pazzazzo/mccitizens-clientpackage/releases/latest/download/clientpackage.zip"
    const file = `jdk-21_${process.platform.replace("win32", "windows")}-${process.arch}_bin.${process.platform == "win32" ? "zip" : "tar.gz"}`
    const url = `https://download.oracle.com/java/21/latest/${file}`
    
    const res = await unzipper.Open.url(request, zip)
    await res.extract({path: "./.mccitizens/"})
})()