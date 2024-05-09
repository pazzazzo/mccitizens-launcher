electronAPI.autoConnect()

let state = "disconnected"
let playBtn = document.getElementById("play")

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
    skinViewer.loadCape(url.cape);
})
electronAPI.onNotConnected(() => {
    location = "../login/index.html"
})
electronAPI.onDownloadStatus(() => {
    
})

// let url = {
//     skin: 'http://textures.minecraft.net/texture/9c5dd4f0347b4db27a4affc5cb85c96d31c486c9f1d0c6ca535118a16b45cdab',
//     cape: 'http://textures.minecraft.net/texture/f9a76537647989f9a0b6d001e320dac591c359e9e61a31f4ce11c88f207f0ad4'
// }

// let skinViewer = new skinview3d.SkinViewer({
//     canvas: document.getElementById("skin_container"),
//     width: 300,
//     height: 400,
//     skin: "img/skin.png"
// });

// // Change viewer size
// skinViewer.width = 600;
// skinViewer.height = 800;

// // Load another skin
// skinViewer.loadSkin(url.skin);

// // Load a cape
// skinViewer.loadCape(url.cape); 