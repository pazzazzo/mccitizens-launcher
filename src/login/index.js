const connect = document.getElementById("connect")
const reset = document.getElementById("reset")
let clickable = true

connect.addEventListener("click", () => {
    if (clickable) {
        clickable = false
        connect.classList.remove("button-enabled")
        connect.classList.add("button-disabled")
        electronAPI.connect()
    }
})
reset.addEventListener("click", () => {
    electronAPI.reset()
})

electronAPI.onConnected(() => {
    location = "../home/index.html"
})