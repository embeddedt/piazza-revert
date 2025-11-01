
if (typeof unsafeWindow.tinymce !== 'undefined') {
    // We manually implement resizing logic for TinyMCE. For some reason the default
    // logic does not work with Piazza's setup.

    const resizeHandleClass = "tox-statusbar__resize-handle";
    tinymce.on('AddEditor', e => {
        const editor = e.editor;

        // wait until the editor DOM is ready
        editor.on('init', () => {
            const container = editor.getContainer();
            if (!container) {
                console.warn("editor container does not exist");
                return;
            }

            const existingHandle = container.querySelector("." + resizeHandleClass);
            if (existingHandle) {
                attachResize(existingHandle, container);
                return;
            }

            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        // Check if the node itself is the handle
                        if (node.classList && node.classList.contains(resizeHandleClass)) {
                            attachResize(node, container);
                            observer.disconnect();
                            return;
                        }

                        // Or check if any descendants of the added node is the handle
                        if (node.querySelector) {
                            const handle = node.querySelector('.' + resizeHandleClass);
                            if (handle) {
                                attachResize(handle, container);
                                observer.disconnect();
                                return;
                            }
                        }
                    }
                }
            });

            observer.observe(container, { childList: true, subtree: true });
        });
    });

    function attachResize(handle, container) {
        handle.addEventListener('pointerdown', ev => {
            console.log("start resize");
            ev.preventDefault();
            handle.setPointerCapture(ev.pointerId);

            const startY = ev.clientY;
            const startHeight = container.offsetHeight;

            const onMouseMove = moveEvent => {
                const delta = moveEvent.clientY - startY;
                const newHeight = Math.max(100, startHeight + delta);

                container.style.height = newHeight + 'px';
            };

            const onMouseUp = upEv => {
                console.log("finish resize");
                handle.releasePointerCapture(upEv.pointerId);
                handle.removeEventListener('pointermove', onMouseMove);
                handle.removeEventListener('pointerup', onMouseUp);
            };

            handle.addEventListener('pointermove', onMouseMove);
            handle.addEventListener('pointerup', onMouseUp);
        });
    }
}