import { loadPackage } from '../utils/cdn_bootstrap';
import { userscriptSettings } from '../utils/settings';

const photoSwipeVersion = "5.4.4";


const imagesToMakeInteractive = "#qanda-content .render-html-content img";

function injectImageHover() {
    if (!userscriptSettings.get("enableHoverPreview")) {
        return;
    }
    /** @type {HTMLDivElement} */
    let previewEl;
    let hoverTimer;
    let lastMouseX = 0;
    let lastMouseY = 0;

    function updatePreviewPosition() {
        const previewRect = previewEl.getBoundingClientRect();
        let desiredX = lastMouseX + 20;
        let desiredY = lastMouseY + 20;
        desiredX = Math.max(0, Math.min(desiredX, document.body.clientWidth - previewRect.width));
        desiredY = Math.max(0, Math.min(desiredY, document.body.clientHeight - previewRect.height));
        // Place preview at last known mouse coordinates
        previewEl.style.transform = `translate(${desiredX}px, ${desiredY}px)`;
    }

    document.addEventListener("mousemove", e => {
        // Always update last known mouse position
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        if (previewEl) {
            updatePreviewPosition();
        }
    });

    document.addEventListener("mouseover", e => {
        const img = e.target.closest(imagesToMakeInteractive);
        if (!img) return;

        // Start delay timer
        hoverTimer = setTimeout(() => {
            previewEl = document.createElement("div");
            previewEl.classList.add("us-image-hover-preview-container");

            const bigImg = document.createElement("img");
            bigImg.src = img.src;

            previewEl.appendChild(bigImg);
            document.body.appendChild(previewEl);

            updatePreviewPosition();

            img.addEventListener("mouseout", () => {
                clearTimeout(hoverTimer);
                if (previewEl) {
                    previewEl.remove();
                    previewEl = null;
                }
            }, { once: true });
        }, userscriptSettings.get("hoverPreviewDelay")); // delay in ms
    });

    document.addEventListener("mouseout", e => {
        const img = e.target.closest(imagesToMakeInteractive);
        if (img) {
            clearTimeout(hoverTimer);
        }
    });

}

function injectImageInteractivity() {
    document.addEventListener("click", async(event) => {
        if (!userscriptSettings.get("enableFancyGallery")) {
            return;
        }

        const clickedImg = event.target.closest(imagesToMakeInteractive);
        if (!clickedImg) return;

        event.preventDefault();

        const container = clickedImg.closest(".render-html-content") || document;
        /** @type Array<HTMLImageElement> */
        const imgs = Array.from(container.querySelectorAll(imagesToMakeInteractive));

        const slides = imgs.map(img => ({
            src: img.src,
            width: img.naturalWidth,
            height: img.naturalHeight,
            alt: img.alt || img.title || ""
        }));

        const startIndex = imgs.indexOf(clickedImg);

        await Promise.all([
            loadPackage(`https://cdn.jsdelivr.net/npm/photoswipe@${photoSwipeVersion}/dist/umd/photoswipe.umd.min.js`),
            loadPackage(`https://cdn.jsdelivr.net/npm/photoswipe@${photoSwipeVersion}/dist/photoswipe.css`, "style")
        ]);

        const pswp = new PhotoSwipe({
            dataSource: slides,
            index: startIndex
        });
        pswp.init();
    });
}

injectImageHover();
injectImageInteractivity();
