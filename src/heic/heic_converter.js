import { loadPackage } from '../utils/cdn_bootstrap';
import { userscriptSettings } from '../utils/settings';

const convertedImageTypes = new Set(["jpeg","jpg","png","heic"]);


function processAnchor(anchor) {
  if (!userscriptSettings.get("heicImageDecoding")) {
    return;
  }

  const href = anchor.getAttribute("href");

  if (!href) return;

  const text = anchor.textContent.trim();
  const normalizedHref = href.toLowerCase();
  const extension = normalizedHref.substring(normalizedHref.lastIndexOf('.') + 1);
  if (!convertedImageTypes.has(extension)) {
    return;
  }
  const textExtension = text.toLowerCase().substring(text.lastIndexOf('.') + 1);
  if (!convertedImageTypes.has(textExtension)) {
    return;
  }

  if (extension == "heic") {
    // We must decode HEICs in software as the browser typically doesn't
    // provide native support for them.
    console.log("Trying to decode HEIC", href);

    const heicPromise = loadPackage("https://cdn.jsdelivr.net/npm/heic-to@1.3.0/dist/iife/heic-to.js");

    GM_xmlhttpRequest({
      method: "GET",
      url: href,
      responseType: "arraybuffer",
      redirect: 'follow',
      onload: async function (res) {
        const blob = new Blob([res.response], { type: "image/heic" });

        await heicPromise;

        unsafeWindow.HeicTo({ blob, type: "image/jpeg" })
          .then((result) => {
            const imgBlob = Array.isArray(result) ? result[0] : result;
            const url = URL.createObjectURL(imgBlob);

            const img = document.createElement("img");
            img.src = url;
            img.alt = text;

            anchor.replaceWith(img);
          })
          .catch((err) => {
            console.error("Failed to convert HEIC:", err);
          });
      },
      onerror: function (err) {
        console.error("Failed to fetch HEIC:", err);
      },
    });
  } else {
    // Do a straight replacement with the desired img
    const img = document.createElement("img");
    img.src = href;
    img.alt = text;

    anchor.replaceWith(img);
  }
}

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "A") {
          processAnchor(node);
        } else {
          node.querySelectorAll?.("a").forEach(processAnchor);
        }
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

document.querySelectorAll("a").forEach(processAnchor);