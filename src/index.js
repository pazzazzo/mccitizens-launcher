lucide.createIcons();
moment.locale('fr')
/* Section */
const sidebarMenuButtons = document.querySelectorAll(".sidebar-menu-button")
const sections = document.querySelectorAll("section")
const sidebarProfileAccount = document.getElementById("sidebar-profile-account")
const sidebarProfileButton = document.getElementById("sidebar-profile-button")
/* Main */
const gameSelector = document.getElementById("game-selector-input")
const skinCanevas = document.getElementById("skin")
const gamePlayBtn = document.getElementById("game-play")
const serverStatusPlayers = document.getElementById("server-status-players")
const serverStatusIndicator = document.getElementById("server-status-indicator")

/* Popup */
const popupView = document.getElementById("popup-view")
const launchPopup = document.getElementById("launch-popup")
const hydixPopup = document.getElementById("hydix-popup")

/* ======================================================================================================= */

/* Sections */
sidebarMenuButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        sidebarMenuButtons.forEach(oldBtn => {
            oldBtn.classList.remove("selected")
        })
        btn.classList.add("selected")
        sections.forEach(section => {
            section.classList.remove("active")
        })
        document.getElementById(`${btn.dataset["select"]}-page`)?.classList.add("active")
    })
})

let profile
const params = new URLSearchParams(window.location.search);
const raw = params.get('payload');
if (raw) {
    profile = JSON.parse(decodeURIComponent(raw));
    document.getElementById("sidebar-profile-icon").src = profile.head
    document.getElementById("sidebar-profile-name").innerText = profile.username
    if (profile.hydix) {
        sidebarProfileAccount.classList.remove("warn")
    } else {
        popupView.classList.add("active")
        hydixPopup.classList.remove("hidden")
    }
    
    let height = 200
    let skinViewer = new skinview3d.SkinViewer({
        canvas: skinCanevas,
        width: height * .75,
        height: height,
    });

    skinViewer.animation = new skinview3d.IdleAnimation();
    skinViewer.controls.enableRotate = false
    skinViewer.controls.enableZoom = false
    skinViewer.zoom = 0.8;

    skinViewer.loadSkin(profile.skin);

    if (profile.cape) {
        skinViewer.loadCape(profile.cape);
    }
    skinCanevas.classList.add("loaded")

    if (profile.state !== "ready") {
        gamePlayBtn.ariaDisabled = "true"
        gamePlayBtn.classList.add("button-disabled")
        gamePlayBtn.classList.remove("button-enabled")
        popupView.classList.add("active")
        launchPopup.classList.remove("hidden")
    }
}
electronAPI.onHydixStatus((state) => {
    if (state && state.username) {
        popupView.classList.remove("active")
        hydixPopup.classList.add("hidden")
    }
})
electronAPI.onStateChange((state) => {
    profile.state = state
    if (profile.state !== "ready") {
        gamePlayBtn.ariaDisabled = "true"
        gamePlayBtn.classList.add("button-disabled")
        gamePlayBtn.classList.remove("button-enabled")
    } else {
        gamePlayBtn.ariaDisabled = "false"
        gamePlayBtn.classList.remove("button-disabled")
        gamePlayBtn.classList.add("button-enabled")
    }
    if (profile.state === "launch") {
        popupView.classList.add("active")
        launchPopup.classList.remove("hidden")
    } else {
        popupView.classList.remove("active")
        launchPopup.classList.add("hidden")
        files.clear()
        finishedFiles.clear()
    }
})

/* Main */
electronAPI.getGames().then(games => {
    games.forEach(game => {
        let opt = document.createElement("option")
        opt.value = game.value
        opt.innerText = game.name
        opt.selected = game.selected
        gameSelector.appendChild(opt)
    })
})
gameSelector.addEventListener("input", () => {
    electronAPI.setGame(gameSelector.value)
})

gamePlayBtn.addEventListener("click", () => {
    if (profile.state === "ready") {
        electronAPI.launch()
    }
})

electronAPI.getServerStatus()
electronAPI.onServerStatus((server) => {
    if (server.online) {
        serverStatusIndicator.classList.remove("off")
        serverStatusPlayers.innerText = server.onlinePlayers

        setTimeout(() => {
            electronAPI.getServerStatus()
        }, 10 * 1000);
    } else {
        serverStatusIndicator.classList.add("off")
        serverStatusPlayers.innerText = "0"
        setTimeout(() => {
            electronAPI.getServerStatus()
        }, 60 * 1000);
    }
});

/* Settings */




/* Game Launching */
const files = new Set()
const finishedFiles = new Set()
let progressTask = document.getElementById("progress-task-type")
let progressPercent = document.getElementById("progress-task-percent")
function updateFileExtract(name, status) {
    let progressBar
    if (!files.has(name) && !finishedFiles.has(name) && Math.floor(status * 100) < 100) {
        files.add(name)
        const progressText = document.createElement("p")
        progressText.classList.add("progress-text")
        progressText.id = "progress-text-" + name
        progressText.innerText = `File: ${name} extracting..`

        const pC = document.createElement("div")
        pC.classList.add("progress-bar-container")

        progressBar = document.createElement("div")
        progressBar.classList.add("progress-bar")
        progressBar.id = "progress-bar-" + name

        pC.appendChild(progressBar)
        launchPopup.appendChild(progressText)
        launchPopup.appendChild(pC)
    } else if (files.has(name) && Math.floor(status * 100) < 100) {
        progressBar = document.getElementById("progress-bar-" + name)
    } else {
        if (files.has(name)) {
            files.delete(name)
            finishedFiles.add(name)
            document.getElementById("progress-text-" + name).remove()
            document.getElementById("progress-bar-" + name).parentElement.remove()
        }
        return
    }
    progressBar.style.width = `${status * 100}%`
}

electronAPI.onDownloadStatus((e) => {
    updateFileExtract(e.name, e.current / e.total)
})

electronAPI.onProgressStatus((e) => {
    progressPercent.innerText = Math.floor(e.task / e.total * 100)
    progressTask.innerText = `${e.type}`
})

electronAPI.onModsSyncProgress((e) => {
    if (e.index && e.total) {
        progressPercent.innerText = Math.floor(e.index / e.total * 100)
    }
    progressTask.innerText = `Mod ${e.type}`
    if (e.file) {
        updateFileExtract(e.file, (e.percent || 0) / 100)
    }
})

electronAPI.onJavaInstallProgress((e) => {
    progressPercent.innerText = Math.floor(e)
    progressTask.innerText = `JDK install`

    updateFileExtract("JDK", e / 100)
})
electronAPI.onClientInstallProgress((e) => {
    progressPercent.innerText = Math.floor(e)
    progressTask.innerText = `Client install`
    updateFileExtract("Client", e / 100)
})