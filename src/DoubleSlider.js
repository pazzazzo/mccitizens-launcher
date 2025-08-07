class DoubleSlider {
    constructor(config = {}) {
        /** @type {number} */
        this.min = config.min || 0

        /** @type {number} */
        this.max = config.max || 100

        /** @type {number} */
        this.step = config.step || 1

        /** @type {number[]} */
        this.values = [(config.defaultMin || this.min), (config.defaultMax || this.max)]

        this.element = document.createElement("div")
        this.element.classList.add("double-slider")

        this.bg_element = document.createElement("div")
        this.bg_element.classList.add("double-slider-bg")

        this.circle_elements = [document.createElement("div"), document.createElement("div")]

        this.connect_element = document.createElement("div")
        this.connect_element.classList.add("double-slider-connect")

        this.element.appendChild(this.bg_element)
        this.element.appendChild(this.connect_element)
        this.circle_elements.forEach(e => { this.element.appendChild(e).classList.add("double-slider-circle") })

        this.innerWidth = 0
        this.x = 0

        this.mouseState = -1

        /**
        * Callback appelé lorsque les valeurs minimale et maximale sont mises à jour.
        *
        * @function onUpdate
        * @memberof DoubleSlider#
        * @param {number} min - La nouvelle valeur minimale.
        * @param {number} max - La nouvelle valeur maximale.
        * @returns {void}
        */
        this.onUpdate = null

        const ro = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                if (width > 0) {
                    this.innerWidth = width

                    this.x = this.element.getBoundingClientRect().left

                    this.update()
                }
            }
        });
        ro.observe(this.element);

        /*
        <div class="double-slider">
            <div class="double-slider-bg"></div>
            <div class="double-slider-circle" style="left: 10%;"></div>
            <div class="double-slider-connect" style="left: 10%; right: 10%;"></div>
            <div class="double-slider-circle" style="left: 90%;"></div>
        </div>
        */
    }
    valueToPercent(val) {
        if (!this.innerWidth) return 0
        let pad = (12 / this.innerWidth) * 100
        let n = pad + ((val - this.min) / (this.max - this.min)) * (100 - 2 * pad)
        return n;
    }

    pxToVal(px) {
        const pad = 12;
        const ratio = (px - pad) / (this.innerWidth - 2 * pad);
        const x = this.min + ratio * (this.max - this.min);
        return this.snapToStep(x)
    }

    snapToStep(val) {
        const ratio = val / this.step;
        const snappedSteps = Math.round(ratio);
        const snappedValue = snappedSteps * this.step;
        const stepDecimals = (this.step.toString().split('.')[1] || '').length;
        return parseFloat(snappedValue.toFixed(stepDecimals));
    }

    /**
     * Append Slider to parent element
     * 
     * @param {HTMLElement} el 
     */
    append(el) {
        el.appendChild(this.element)

        this.circle_elements.forEach((e, i) => {
            e.addEventListener("mousedown", () => {
                this.mouseState = i
            })
        })

        document.addEventListener("mouseup", () => {
            this.mouseState = -1
        })
        document.addEventListener("mousemove", ME => {
            if (this.mouseState > -1) {
                if (ME.x >= (this.x + 12) && ME.x <= (this.x + this.innerWidth - 12)) {
                    let [oldMinValue, oldMaxValue] = [...this.values].sort((a, b) => a - b)
                    let val = this.pxToVal(ME.x - this.x)
                    this.values[this.mouseState] = val
                    this.circle_elements[this.mouseState].style.left = `${this.valueToPercent(val)}%`

                    let [minValue, maxValue] = [...this.values].sort((a, b) => a - b)

                    this.connect_element.style.left = `${this.valueToPercent(minValue)}%`
                    this.connect_element.style.right = `${100 - this.valueToPercent(maxValue)}%`

                    if ((minValue !== oldMinValue || maxValue !== oldMaxValue) && typeof this.onUpdate === "function") {
                        this.onUpdate(...[...this.values].sort((a, b) => a - b))
                    }
                }
            }
        })
        this.onUpdate(...[...this.values].sort((a, b) => a - b))
        this.update()
    }
    update() {
        let [minValue, maxValue] = [...this.values].sort((a, b) => a - b)
        this.circle_elements[0].style.left = `${this.valueToPercent(minValue)}%`
        this.circle_elements[1].style.left = `${this.valueToPercent(maxValue)}%`
        this.connect_element.style.left = `${this.valueToPercent(minValue)}%`
        this.connect_element.style.right = `${100 - this.valueToPercent(maxValue)}%`
    }
}

export default DoubleSlider