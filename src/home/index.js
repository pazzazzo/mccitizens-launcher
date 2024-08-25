electronAPI.autoConnect()

let state = "disconnected"
let playBtn = document.getElementById("play")
let serverStatus = document.getElementById("status-server")
let load = document.getElementById("load")
let title = document.getElementById("title")

playBtn.addEventListener("click", () => {
    if (state === "ready") {
        state = "launch"
        playBtn.classList.remove("button-enabled")
        playBtn.classList.add("button-disabled")
        electronAPI.launch()
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
electronAPI.onDownloadStatus(() => {
    
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