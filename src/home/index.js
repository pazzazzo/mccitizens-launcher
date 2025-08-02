electronAPI.autoConnect()

let state = "disconnected"
let playBtn = document.getElementById("play")
let serverStatus = document.getElementById("status-server")
let load = document.getElementById("load")
let title = document.getElementById("title")
let startPopup = document.getElementById("start-popup")
let progressText = document.getElementById("progress-text")
let progressTask = document.getElementById("progress-task")
let progressBar = document.getElementById("progress-bar")
let progressPercent = document.getElementById("progress-percent")

playBtn.addEventListener("click", () => {
    if (state === "ready") {
        state = "launch"
        playBtn.classList.remove("button-enabled")
        playBtn.classList.add("button-disabled")
        electronAPI.launch()
        startPopup.classList.remove("hidden")
    }
})

electronAPI.getPlayState().then(s => {
    state = s
    if (state === "ready") {
        playBtn.classList.add("button-enabled")
        playBtn.classList.remove("button-disabled")
    } else if (state === "launch") {
        playBtn.classList.remove("button-enabled")
        playBtn.classList.add("button-disabled")
        startPopup.classList.remove("hidden")
    }
})

electronAPI.onConnected((url, player) => {
    if (state !== "launch") state = "ready"
    playBtn.classList.add("button-enabled")
    playBtn.classList.remove("button-disabled")
    console.log(url);
    document.getElementById("skin").classList.add("loaded")
    document.getElementById("user-icon").src = url.head
    document.getElementById("user-name").innerText = player.username
    height = 200
    let skinViewer = new skinview3d.SkinViewer({
        canvas: document.getElementById("skin"),
        width: height * .75,
        height: height,
    });
    // Rotate the player
    skinViewer.animation = new skinview3d.IdleAnimation();
    skinViewer.controls.enableRotate = false
    skinViewer.controls.enableZoom = false
    skinViewer.zoom = 0.8;

    // Load another skin
    skinViewer.loadSkin(url.skin);

    // Load a cape
    if (url.cape) {
        skinViewer.loadCape(url.cape);
    }
    load.classList.add("hidden")
    title.classList.add("ready")
})
electronAPI.onNotConnected(() => {
    location = "../login/index.html"
})
const files = new Set()
const finishedFiles = new Set()
const cardBody = document.getElementById("card-body")
const epsilon = 0.05
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
        cardBody.appendChild(progressText)
        cardBody.appendChild(pC)
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
    progressTask.innerText = `Task: ${e.type}`
})

electronAPI.onModsSyncProgress((e) => {
    progressPercent.innerText = Math.floor(e.index / e.total * 100)
    progressTask.innerText = `Task: mod ${e.type}`
    updateFileExtract(e.type, (e.percent || 0) / 100)
})

electronAPI.onJavaInstallProgress((e) => {
    progressPercent.innerText = Math.floor(e)
    progressTask.innerText = `Task: JDK install`

    updateFileExtract("JDK", e / 100)
})
electronAPI.onClientInstallProgress((e) => {
    progressPercent.innerText = Math.floor(e)
    progressTask.innerText = `Task: Client install`
    updateFileExtract("Client", e / 100)
})

electronAPI.getIP().then(res => {
    electronAPI.getStatus(...res.split(":")).then(r => {
        console.log(r);
        if (r.online) {
            serverStatus.classList.remove("off")
            serverStatus.innerHTML = "check"
        } else {
            serverStatus.classList.add("off")
            serverStatus.innerHTML = "close"
        }
    })
})