import styleTweaks from './style_tweaks.scss';
import { userscriptSettings } from './utils/settings';
import './heic/heic_converter';
import './patches/tinymce';
import './patches/image_gallery';

console.log("Bootstrapped Piazza Revert");

GM_addStyle(styleTweaks);

function injectEndorsementFix() {
    const endorsementInfo = new Map();
    let lastKnownPathname = null;

    function populateEndorsementInfo(obj) {
        if (!obj || typeof obj !== 'object') return;

        const endorse = [obj.tag_good, obj.tag_endorse].find(Boolean);

        // If the object has an id and tag_good, store it in the Map
        if (obj.id && Array.isArray(endorse) && endorse.length > 0) {
            endorsementInfo.set(obj.id, endorse);
        }

        // Recurse into object properties
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const val = obj[key];
                if (Array.isArray(val)) {
                    val.forEach(item => populateEndorsementInfo(item));
                } else if (typeof val === 'object' && val !== null) {
                    populateEndorsementInfo(val);
                }
            }
        }
    }

    async function updateEndorsementInfo() {
        const url = window.location.pathname;

        const match = url.match(/\/class\/([^\/]+)\/post\/([^\/]+)/);

        endorsementInfo.clear();

        if (match) {
            const classId = match[1];
            const postId = match[2];
            const res = await fetch("https://piazza.com/logic/api?method=content.get", {
                "credentials": "include",
                "headers": {
                    "Accept": "application/json, text/plain, */*",
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache",
                    "CSRF-Token": unsafeWindow.CSRF_TOKEN
                },
                "referrer": window.location.href,
                "body": JSON.stringify({
                    "method": "content.get",
                    "params": {
                        "cid": postId,
                        "nid": classId,
                        "student_view": null
                    }
                }),
                "method": "POST",
                "mode": "cors"
            });
            const val = await res.json();
            populateEndorsementInfo(val);
        }
        console.log(endorsementInfo);
    }

    function findIdFromArticle(article) {
        const targetDiv = article.querySelector('div[id$="_render"]');
        if (targetDiv != null) {
            return targetDiv.id.replace(/_render$/, '');
        } else {
            return "unknown";
        }
    }

    async function handleEndorsement(targetNode) {
        if (targetNode.classList.contains("endorsement-patched")) {
            return;
        }

        if (lastKnownPathname != window.location.pathname) {
            await updateEndorsementInfo();
            lastKnownPathname = window.location.pathname;
        }
        let commentId;
        const instructorAnswerArticle = targetNode.closest('article[aria-label="Instructor Answer"]');
        if (instructorAnswerArticle) {
            commentId = findIdFromArticle(instructorAnswerArticle);
        } else {
            const mainQuestionArticle = targetNode.closest('article[id="qaContentViewId"]');
            if (mainQuestionArticle != null) {
                commentId = findIdFromArticle(mainQuestionArticle);
            } else {
                const commentDiv = targetNode.closest('div[id]');
                if (commentDiv != null) {
                    commentId = commentDiv.id;
                }
            }
        }
        let info = endorsementInfo.get(commentId) ?? [];
        info = info.filter(obj => obj.admin).map(obj => obj.name);
        console.log('Found endorsement:', targetNode, "id:", commentId, "info:", info);
        if (info.length > 1) {
            // Swap content
            targetNode.classList.add("endorsement-patched");
            targetNode.textContent = "Endorsed by Instructors (" + info.join(', ') + ")";
        }
    }

    const observer = new MutationObserver(async(mutationsList) => {
        for (const mutation of mutationsList) {
            // Check any newly added nodes
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) { // element
                    // Case 1: The new node itself is the <b> inside .badge-success
                    if (node.matches('div.badge-success > b') && node.textContent.trim().startsWith("Endorsed by Instructor")) {
                        await handleEndorsement(node);
                    }

                    // Case 2: A container was added that *contains* the target <b>
                    const targetList = node.querySelectorAll?.('div.badge-success > b');
                    for (const target of targetList) {
                        if (target && target.textContent.trim().startsWith("Endorsed by Instructor")) {
                            await handleEndorsement(target);
                        }
                    }
                }
            }

            // Also check if an existing <b> just got text content added/changed
            if (mutation.type === "characterData") {
                const parent = mutation.target.parentElement;
                if (parent?.matches('div.badge-success > b') && parent.textContent.trim().startsWith("Endorsed by Instructor")) {
                    await handleEndorsement(parent);
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,        // watch for added/removed elements
        subtree: true,          // include descendants
        characterData: true     // detect text/content changes
    });
}

function waitForElement(selector, callback) {
    const el = document.querySelector(selector);
    if (el) {
        callback(el);
        return;
    }

    const observer = new MutationObserver((mutations, obs) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.matches(selector)) {
                    obs.disconnect();
                    callback(node);
                    return;
                }
                // Also check descendants
                const found = node.querySelector(selector);
                if (found) {
                    obs.disconnect();
                    callback(found);
                    return;
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

waitForElement("#piazza_homepage_id", el => {
    const settingsButton = document.createElement("a");
    settingsButton.href = "#";
    settingsButton.textContent = "Userscript settings";
    settingsButton.className = "dropdown-item"; // match styling
    settingsButton.style.cursor = "pointer";

    // Open settings dialog when clicked
    settingsButton.addEventListener("click", e => {
        e.preventDefault();
        userscriptSettings.showDialog(); // your SettingsManager instance
    });

    // Insert it right after the original element
    el.insertAdjacentElement("afterend", settingsButton);
});

injectEndorsementFix();