/**
 * @typedef {import('electron-store')} ElectronStore
 */

const { Auth } = require("msmc");
const EventEmitter = require("events")

class XboxManager extends EventEmitter {
    #state;
    /**
     * 
     * @param {ElectronStore} store 
     */
    constructor(store) {
        super()
        this.msAuthToken = store.get("token") || {}
        this.xbox
        this.store = store
        this.authManager = new Auth("select_account");
    }

    autoConnect() {
        return new Promise((res, rej) => {
            if (this.msAuthToken && this.msAuthToken["access_token"] && this.msAuthToken["refresh_token"] && !this.xbox) {
                this.authManager.refresh(this.msAuthToken).then(async xboxManager => {
                    let mc = await xboxManager.getMinecraft();
                    this.profile = mc.profile
                    res()
                    if (this.state !== "launch") this.state = "ready"
                    this.xbox = xboxManager
                }).catch(r => {
                    rej(r)
                    this.state = "disconnected"
                    console.log(r);
                })
            } else if (this.profile) {
                res()
                if (this.state !== "launch") this.state = "ready"
            } else if (this.xbox) {
                this.xbox.getMinecraft().then(mc => {
                    this.profile = mc.profile
                    res()
                    if (this.state !== "launch") this.state = "ready"
                }).catch(e => {
                    rej(e)
                    this.state = "disconnected"
                    console.log(e);
                })
            } else {
                rej("no_account")
                this.state = "disconnected"
            }
        })
    }

    get playerData() {
        if (this.profile) {
            return { "skin": this.profile.skins[0].url, "cape": this.profile.capes[0]?.url, "head": `https://mc-heads.net/head/${this.profile.name}/left`, "username": this.profile.name, "state": this.state }
        } else {
            return {}
        }
    }

    get state() {
        return this.#state
    }


    /**
     * Change l'état.
     * @param {"disconnected"|"launch"|"launched"|"ready"} v - Nouvel état autorisé
     */
    set state(v) {
        this.emit("state", v)
        this.#state = v
    }

    getMinecraft() {
        return this.xbox.getMinecraft()
    }

    connectModal() {
        return new Promise((res, rej) => {
            this.authManager.launch("electron").then(async xboxManager => {
                this.msAuthToken["access_token"] = xboxManager.msToken.access_token
                this.msAuthToken["refresh_token"] = xboxManager.msToken.refresh_token
                this.store.set("token", this.msAuthToken)
                let mc = await xboxManager.getMinecraft();
                this.profile = mc.profile
                res()
                if (this.state !== "launch") this.state = "ready"
                this.xbox = xboxManager
            }).catch(r => {
                rej(r)
            })
        })
    }
}

module.exports = XboxManager