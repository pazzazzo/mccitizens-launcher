electronAPI.autoConnect()

let state = "disconnected"
let load = document.getElementById("load")
let maxRamInput = document.getElementById("max-ram")
let minRamInput = document.getElementById("min-ram")
let javaSaveBtn = document.getElementById("java-save")
let loadProfileBtn = document.getElementById("loadProfile")
let quitOnLaunchBtn = document.getElementById("quit-on-launch")
let modsList = document.getElementById("mods-list")

electronAPI.getMemory().then(m => {
    m = Math.floor(Number(m.total)/10**9)
    console.log(m);
    
    maxRamInput.max = m
    minRamInput.max = m
})
electronAPI.getJavaOption().then(o => {
    console.log(o);
    
    maxRamInput.value = o.maxRam
    minRamInput.value = o.minRam
})
electronAPI.getLauncherOption().then((o = {}) => {
    console.log(o);
    
    if (Object.prototype.hasOwnProperty.call(o, "quitOnLaunch")) {
        if (!o.quitOnLaunch) {
            quitOnLaunchBtn.classList.remove("color-red")
            quitOnLaunchBtn.classList.add("color-blue")
            quitOnLaunchBtn.dataset.text = "Activer"
            quitOnLaunchBtn.innerHTML = "Activer"
        }
    }
})

loadProfileBtn.addEventListener("click", () => {
    if (!loadProfileBtn.classList.contains("button-enabled")) {
        return
    }
    electronAPI.loadProfile()
    loadProfileBtn.classList.remove("button-enabled")
    loadProfileBtn.classList.add("button-disabled")
})

quitOnLaunchBtn.addEventListener("click", () => {
    if (quitOnLaunchBtn.innerHTML === "Activer") {
        quitOnLaunchBtn.dataset.text = "Désactiver"
        quitOnLaunchBtn.innerHTML = "Désactiver"
        electronAPI.setLauncherOption({"quitOnLaunch": true})
    } else {
        quitOnLaunchBtn.dataset.text = "Activer"
        quitOnLaunchBtn.innerHTML = "Activer"
        electronAPI.setLauncherOption({"quitOnLaunch": false})
    }
    quitOnLaunchBtn.classList.toggle("color-red")
    quitOnLaunchBtn.classList.toggle("color-blue")
})

electronAPI.onLoadProfileStatus((success, r) => {
    if (success) {
        loadProfileBtn.classList.add("button-enabled")
        loadProfileBtn.classList.remove("button-disabled")
        popup.info("Profile importé avec succès")
    } else {
        popup.error("Profile non importé")
    }
})
function correctInput(e) {
    if (Number(e.target.value) < 2) {
        e.target.value = 2
    }
    if (Number(e.target.value) > Number(e.target.max)) {
        e.target.value = e.target.max
    }
    if (e.target === maxRamInput && minRamInput.value && Number(e.target.value) < Number(minRamInput.value)) {
        minRamInput.value = e.target.value
    }
    if (e.target === minRamInput && maxRamInput.value && Number(e.target.value) > Number(maxRamInput.value)) {
        e.target.value = maxRamInput.value
    }
}

maxRamInput.onblur = correctInput
minRamInput.onblur = correctInput

javaSaveBtn.addEventListener("click", () => {
    electronAPI.setJavaOption({
        maxRam: maxRamInput.value,
        minRam: minRamInput.value
    })
})

electronAPI.onConnected((url, player) => {
    state = "ready"
    console.log(url);
    document.getElementById("user-icon").src = url.head
    document.getElementById("user-name").innerText = player.username
    load.classList.add("hidden")
})
electronAPI.onNotConnected(() => {
    location = "../login/index.html"
})
electronAPI.onDownloadStatus(() => {
    
})

electronAPI.getStatus("193.250.155.77").then(r => {
    console.log(r);
})

electronAPI.getModsData()
electronAPI.onModData((data) => {
    console.log(data);
    modsList.innerHTML += `<div class="mod-item"><img src="${data.logoBase64 ? `data:image/png;base64,${data.logoBase64}` : "../assets/images/placeholder.svg"}" width="32" height="32" alt="Mod Icon"><div class="mod-info"><div class="mod-name">${data.displayName}</div><div class="mod-version">v${data.version}</div></div><button class="color-red button-normal button-disabled button-large remove-mod" id="reset"data-text="Remove">Remove</button></div>`
})