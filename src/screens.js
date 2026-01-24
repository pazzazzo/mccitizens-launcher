(async () => {
    const galleryViewer = document.getElementById("gallery-viewer")
    const galleryImage = document.getElementById("gallery-image")
    const galleryNext = document.getElementById("gallery-right")
    const galleryPrev = document.getElementById("gallery-left")
    const gallerySave = document.getElementById("gallery-save")
    const galleryDate = document.getElementById("gallery-date")
    const galleryText = document.getElementById("gallery-text")
    let i = 0
    const images = await electronAPI.getScreens()
    function update() {
        galleryImage.src = images[i].data
        galleryDate.innerText = moment(images[i].date).calendar()
    }
    if (images.length) {
        update()
        galleryText.classList.add("hidden")
        galleryViewer.classList.remove("hidden")
    }
    galleryNext.addEventListener("click", () => {
        i = (i + 1) % images.length
        update()
    })
    galleryPrev.addEventListener("click", () => {
        i = (i - 1 + images.length) % images.length
        update()
    })
    gallerySave.addEventListener("click", () => {
        electronAPI.saveScreen(images[i].name)
    })
})()