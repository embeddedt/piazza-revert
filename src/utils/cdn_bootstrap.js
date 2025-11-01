

const loadedPackages = new Map();

/**
 * Dynamically load a package from a CDN.
 * @param {string} url
 * @param {string} type
 * @returns {Promise<void>}
 */
export function loadPackage(url, type = "script") {
    const key = url + "|" + type;
    let promise = loadedPackages.get(key);
    if (typeof promise === 'undefined') {
        promise = loadPackageInternal(url, type);
        loadedPackages.set(key, promise);
    }
    return promise;
}

export function loadPackageInternal(url, type) {
    return new Promise((resolve, reject) => {
        /** @type {HTMLElement} */
        let element;
        if (type == "script") {
            element = document.createElement("script");
            element.src = url;
        } else if (type == "style") {
            element = document.createElement("link");
            element.rel = "stylesheet";
            element.type = "text/css";
            element.href = url;
        } else {
            reject({error:"Unknown package type: " + type});
            return;
        }
        element.onload = resolve;
        element.onerror = reject;
        document.head.appendChild(element);
    });
}