electronAPI.autoConnect()

let state = "disconnected"
let load = document.getElementById("load")
let maxRamInput = document.getElementById("max-ram")
let minRamInput = document.getElementById("min-ram")
let javaSaveBtn = document.getElementById("java-save")

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
