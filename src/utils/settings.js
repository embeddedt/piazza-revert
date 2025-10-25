export class SettingsManager {
    constructor(storageKey = "piazzaRevertUserscriptSettings") {
        this.storageKey = storageKey;
        this.settings = {};
        this.load();
        this._fireInitialEvents();
    }

    // Define a new setting
    addSetting({ key, label, type = "boolean", defaultValue = false }) {
        if (!(key in this.settings)) {
            this.settings[key] = defaultValue;
            this._fireEvent(key, null, defaultValue);
        }
        // Store metadata
        if (!this._meta) this._meta = {};
        this._meta[key] = { label, type };
    }

    // Toggle boolean setting
    set(key, value) {
        const oldValue = this.settings[key];
        this.settings[key] = value;
        this.save();

        // Fire a custom event
        this._fireEvent(key, oldValue, value);
    }

    get(key) {
        return this.settings[key];
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    }

    load() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                this.settings = JSON.parse(stored);
            } catch { }
        }
    }

    _fireEvent(key, oldValue, newValue) {
        const event = new CustomEvent("SettingsChanged", {
            detail: { key, oldValue, newValue }
        });
        window.dispatchEvent(event);
    }

    _fireInitialEvents() {
        for (const key in this.settings) {
            this._fireEvent(key, null, this.settings[key]);
        }
    }

    // Build settings popover
    showDialog() {
        const existing = document.getElementById("userscript-settings-dialog");
        if (existing) existing.remove();

        // Overlay
        const overlay = document.createElement("div");
        overlay.className = "us-settings-overlay";

        // Dialog
        const dialog = document.createElement("div");
        dialog.className = "us-settings-dialog";

        // Title
        const title = document.createElement("h2");
        title.textContent = "Settings";
        dialog.appendChild(title);

        // Build settings inputs
        for (const key in this._meta) {
            const meta = this._meta[key];
            const container = document.createElement("div");
            container.className = "setting-container";

            if (meta.type === "boolean") {
                const label = document.createElement("label");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = !!this.get(key);
                checkbox.addEventListener("change", e => this.set(key, e.target.checked));
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(meta.label));
                container.appendChild(label);
            } else if (meta.type === "number") {
                const label = document.createElement("label");
                label.style.flexDirection = "column";
                label.style.fontSize = "14px";
                label.textContent = meta.label;
                const input = document.createElement("input");
                input.type = "number";
                input.value = this.get(key);
                input.addEventListener("change", e => this.set(key, parseFloat(e.target.value)));
                label.appendChild(input);
                container.appendChild(label);
            }

            dialog.appendChild(container);
        }

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.className = "close-btn";
        closeBtn.textContent = "Close";
        closeBtn.addEventListener("click", () => {
            dialog.remove();
            overlay.remove();
        });
        dialog.appendChild(closeBtn);

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        // Click outside closes
        overlay.addEventListener("click", () => {
            dialog.remove();
            overlay.remove();
        });
    }
}

window.addEventListener("SettingsChanged", (e) => {
    const { key, newValue } = e.detail;

    if (typeof newValue === 'boolean') {
        const clzName = "us-feature-" + key;
        const clzList = document.documentElement.classList;
        if (!newValue) {
            clzList.remove(clzName);
        } else {
            clzList.add(clzName);
        }
    }
});

const userscriptSettings = new SettingsManager();

userscriptSettings.addSetting({ key: "smallerImagesInPosts", label: "Smaller Images in Posts", defaultValue: true });
userscriptSettings.addSetting({ key: "enableHoverPreview", label: "Enable Image Hover Preview", defaultValue: true });
userscriptSettings.addSetting({ key: "hoverPreviewDelay", label: "Hover Preview Delay (ms)", type: "number", defaultValue: 400 });
userscriptSettings.addSetting({ key: "enableFancyGallery", label: "Enable Image Enlarge on Click", defaultValue: true });
userscriptSettings.addSetting({ key: "heicImageDecoding", label: "Auto-Convert Image Links", defaultValue: true });

export { userscriptSettings };