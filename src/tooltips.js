(() => {
    const MARGIN = 8;
    const GAP = 10;
    const DEFAULT_PLACEMENT = 'top';

    const tip = document.createElement('div');
    tip.className = 'ui-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'live-tooltip';
    tip.innerHTML = '<div class="arrow" aria-hidden="true"></div><div class="content"></div>';
    document.body.appendChild(tip);

    //   const arrow = tip.querySelector('.arrow');
    const content = tip.querySelector('.content');

    let currentTarget = null;
    let hideTimer = null;

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    function measure() {
        tip.style.visibility = 'hidden';
        tip.classList.add('show'); // forcer le layout à la taille finale (opacity 1)
        const rect = tip.getBoundingClientRect();
        tip.classList.remove('show');
        tip.style.visibility = '';
        return rect;
    }

    function computePosition(target, preferred) {
        const tr = target.getBoundingClientRect();
        const vw = innerWidth, vh = innerHeight;
        const sr = measure();

        const placements = [preferred, 'top', 'bottom', 'right', 'left']
            .filter((v, i, self) => v && self.indexOf(v) === i); // uniques, préféré d'abord

        for (const place of placements) {
            let top, left;
            if (place === 'top') {
                top = tr.top - sr.height - GAP;
                left = tr.left + tr.width / 2 - sr.width / 2;
                if (top >= MARGIN) {
                    left = clamp(left, MARGIN, vw - sr.width - MARGIN);
                    return { top, left, place };
                }
            }
            if (place === 'bottom') {
                top = tr.bottom + GAP;
                left = tr.left + tr.width / 2 - sr.width / 2;
                if (top + sr.height <= vh - MARGIN) {
                    left = clamp(left, MARGIN, vw - sr.width - MARGIN);
                    return { top, left, place };
                }
            }
            if (place === 'right') {
                top = tr.top + tr.height / 2 - sr.height / 2;
                left = tr.right + GAP;
                if (left + sr.width <= vw - MARGIN) {
                    top = clamp(top, MARGIN, vh - sr.height - MARGIN);
                    return { top, left, place };
                }
            }
            if (place === 'left') {
                top = tr.top + tr.height / 2 - sr.height / 2;
                left = tr.left - sr.width - GAP;
                if (left >= MARGIN) {
                    top = clamp(top, MARGIN, vh - sr.height - MARGIN);
                    return { top, left, place };
                }
            }
        }
        // fallback: centré dans l'écran
        return {
            top: clamp((vh - sr.height) / 2, MARGIN, vh - sr.height - MARGIN),
            left: clamp((vw - sr.width) / 2, MARGIN, vw - sr.width - MARGIN),
            place: 'bottom'
        };
    }

    function showTip(target) {
        const text = target.getAttribute('data-tooltip');
        if (!text) return;
        clearTimeout(hideTimer);

        content.textContent = text;
        const preferred = (target.getAttribute('data-placement') || DEFAULT_PLACEMENT).toLowerCase();
        const { top, left, place } = computePosition(target, preferred);

        tip.style.top = `${Math.round(top)}px`;
        tip.style.left = `${Math.round(left)}px`;
        tip.classList.remove('place-top', 'place-bottom', 'place-left', 'place-right');
        tip.classList.add(`place-${place}`);
        tip.classList.add('show');

        // accessibilité
        currentTarget = target;
        target.setAttribute('aria-describedby', 'live-tooltip');
        document.addEventListener('keydown', onKeydown, { once: false });
        window.addEventListener('scroll', onScrollResize, { passive: true });
        window.addEventListener('resize', onScrollResize);
    }

    function hideTip(immediate = false) {
        clearTimeout(hideTimer);
        const doHide = () => {
            tip.classList.remove('show');
            if (currentTarget) currentTarget.removeAttribute('aria-describedby');
            currentTarget = null;
            document.removeEventListener('keydown', onKeydown);
            window.removeEventListener('scroll', onScrollResize);
            window.removeEventListener('resize', onScrollResize);
        };
        if (immediate) doHide();
        else hideTimer = setTimeout(doHide, 80);
    }

    function onKeydown(e) { if (e.key === 'Escape') hideTip(true); }
    function onScrollResize() { if (currentTarget) showTip(currentTarget); }

    // Délégation d’événements (souris + clavier)
    document.addEventListener('mouseover', e => {
        const t = e.target.closest('[data-tooltip]');
        if (!t) return;
        showTip(t);
    });
    document.addEventListener('mouseout', e => {
        const from = e.target.closest('[data-tooltip]');
        const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tooltip]');
        if (from && from !== to) hideTip();
    });
    document.addEventListener('focusin', e => {
        const t = e.target.closest('[data-tooltip]');
        if (t) showTip(t);
    });
    document.addEventListener('focusout', e => {
        if (e.target.closest('[data-tooltip]')) hideTip();
    });

    // Tactile : appui court = afficher brièvement
    let touchTimer = null;
    document.addEventListener('touchstart', e => {
        const t = e.target.closest('[data-tooltip]');
        if (!t) return;
        showTip(t);
        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => hideTip(), 1500);
    }, { passive: true });
    document.addEventListener('touchend', () => { /* laissé simple */ }, { passive: true });
})();
