const connect = document.getElementById("connect")
let clickable = true

connect.addEventListener("click", () => {
    if (clickable) {
        clickable = false
        connect.classList.remove("button-enabled")
        connect.classList.add("button-disabled")
        electronAPI.connect()
    }
})

electronAPI.onConnected(() => {
    location = "../home/index.html"
})