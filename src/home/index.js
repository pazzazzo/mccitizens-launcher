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

electronAPI.onConnected((url, player) => {
    state = "ready"
    console.log(url);
    document.getElementById("skin").classList.add("loaded")
    document.getElementById("user-icon").src = url.head
    document.getElementById("user-name").innerText = player.username
    height = 200
    let skinViewer = new skinview3d.SkinViewer({
        canvas: document.getElementById("skin"),
        width: height*.75,
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
electronAPI.onDownloadStatus((e) => {
    progressBar.style.width = `${Math.floor(e.current/e.total*100)}%`
    progressText.innerText = `File: ${e.name} extracting..`
})

electronAPI.onProgressStatus((e) => {
    progressPercent.innerText = Math.floor(e.task/e.total*100)
    progressTask.innerText = `Task: ${e.type}`
})

electronAPI.getStatus("193.250.155.77").then(r => {
    console.log(r);
    if (r.online) {
        serverStatus.classList.remove("off")
        serverStatus.innerHTML = "check"
    } else {
        serverStatus.classList.add("off")
        serverStatus.innerHTML = "close"
    }
})