import DoubleSlider from "./DoubleSlider.js";

const settingsMinRamSpan = document.getElementById("settings-min-ram");
const settingsMaxRamSpan = document.getElementById("settings-max-ram");
const dropZone = document.getElementById("settings-import-btn");
const settingsCloseLauncher = document.getElementById("settings-close-launcher")

const profilePopup = document.getElementById("profile-popup");
const profileLogs = document.getElementById("profile-logs");
const profileClose = document.getElementById("profile-close");
const popupView = document.getElementById("popup-view");

const settingsMods = document.getElementById("settings-mods");

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    console.log(eventName);

    dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});
dropZone.addEventListener('dragover', (e) => {
    dropZone.classList.add('dragover');
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
});
dropZone.addEventListener("dragenter", (e) => {
    dropZone.classList.add('dragover');
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
})
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('dragover');
    console.log(e.dataTransfer.files[0]);
    if (e.dataTransfer.files[0]) {
        electronAPI.loadProfile(electronAPI.getPath(e.dataTransfer.files[0]))
    }
});
dropZone.addEventListener("click", () => {
    electronAPI.loadProfile()
})

electronAPI.onLoadProfileStatus((e) => {
    popupView.classList.add("active")
    profilePopup.classList.remove("hidden")
    if (e) {
        profileClose.classList.add("button-disabled")
        if (e.type === "work") {
            const p = document.createElement("p")
            p.innerText = e.path
            if (e.path.indexOf(" ") > -1) {
                p.classList.add("warn")
            }
            profileLogs.appendChild(p)
        } else if (e.type === "fail") {
            const p = document.createElement("p")
            p.innerText = e.error
            p.classList.add("red")
            profileLogs.appendChild(p)
        }

    } else {
        profileClose.classList.remove("button-disabled")
        const p = document.createElement("p")
        p.innerText = "Sync finished"
        p.classList.add("green")
        profileLogs.appendChild(p)
    }
    profileLogs.scrollTop = profileLogs.scrollHeight
})
profileClose.addEventListener("click", () => {
    popupView.classList.remove("active")
    profilePopup.classList.add("hidden")
    profileLogs.innerHTML = "<p>Hydix File System ...</p>"
})

Promise.all([electronAPI.getMemory(), electronAPI.getJavaOption()]).then(([m, opts]) => {
    let max = Math.floor(Number(m.total) / 10 ** 9)
    console.log(opts);

    const ramSlider = new DoubleSlider({
        min: 1,
        max,
        defaultMin: opts.minRam,
        defaultMax: opts.maxRam
    })
    ramSlider.onUpdate = (minRam, maxRam) => {
        settingsMinRamSpan.innerText = minRam
        settingsMaxRamSpan.innerText = maxRam
        electronAPI.setJavaOption({
            minRam,
            maxRam
        })
    }
    ramSlider.append(document.getElementById("ram-settings"))
})

electronAPI.getLauncherOption().then((opts) => {
    settingsCloseLauncher.checked = opts.quitOnLaunch
})
electronAPI.getModsData()
electronAPI.onModData(d => {
    console.log(d);
    
    let required = true
    // Container principal
    const modEl = document.createElement("div");
    modEl.classList.add("mod");

    // Icône
    const img = document.createElement("img");
    img.src = d.logoBase64 ? `data:image/png;base64,${d.logoBase64}` : "./assets/images/placeholder.svg";
    img.alt = "Icone du mod";
    modEl.appendChild(img);

    // Données (nom + version)
    const dataWrap = document.createElement("div");
    dataWrap.classList.add("mod-data");
    const pName = document.createElement("p");
    pName.textContent = d.displayName;
    const pVersion = document.createElement("p");
    pVersion.textContent = d.version;
    dataWrap.append(pName, pVersion);
    modEl.appendChild(dataWrap);

    // Icône d’info
    const about = document.createElement("div");
    about.classList.add("about-mod");
    about.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="info" class="lucide lucide-info"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`
    modEl.appendChild(about);

    // Bouton
    const btn = document.createElement("button");
    btn.classList.add(
        "color-red",
        "button-normal",
        "button-large",
        ...(required ? ["button-disabled"] : ["button-enabled"])
    );
    btn.setAttribute("data-text", required ? "Obligatoire" : "Désactiver");
    btn.textContent = required ? "Obligatoire" : "Désactiver";
    modEl.appendChild(btn);
    settingsMods.appendChild(modEl)
})

settingsCloseLauncher.addEventListener("change", () => {
    electronAPI.setLauncherOption({ quitOnLaunch: settingsCloseLauncher.checked })
})